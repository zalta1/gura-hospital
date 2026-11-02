"""Controlled agent tools. Agents have no ORM/session of their own.

Every call is authorized against SessionContext on the server — not merely
filtered in the prompt.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Callable
from uuid import UUID, uuid4

from sqlalchemy import Select, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.agents.context import SessionContext
from app.agents.safety import (
    ALLOWED_TOOLS,
    PATIENT_PROFILE_FIELDS,
    PENDING_REVIEW,
    review_status_for,
)
from app.core.errors import AppError
from app.core.rate_limit import limiter
from app.db.models import (
    AgentAction,
    Appointment,
    AppointmentStatus,
    ConsentRecord,
    Escalation,
    EscalationSeverity,
    FollowUpMessage,
    FollowUpPlan,
    Patient,
    PatientResponse,
    Provider,
    ProviderAvailability,
    ReviewStatus,
    Role,
)


ToolFn = Callable[[Session, SessionContext, dict[str, Any]], dict[str, Any]]


def _audit_action(
    db: Session,
    ctx: SessionContext,
    tool_name: str,
    arguments: dict[str, Any],
    summary: str,
    status: ReviewStatus,
) -> AgentAction:
    row = AgentAction(
        organization_id=ctx.organization_id,
        session_id=ctx.conversation_session_id,
        user_id=ctx.user_id,
        tool_name=tool_name,
        arguments=arguments,
        result_summary=summary,
        review_status=status,
    )
    db.add(row)
    db.flush()
    return row


def _same_org(stmt: Select, model, org_id: UUID) -> Select:
    return stmt.where(model.organization_id == org_id)


def _assert_patient_scope(ctx: SessionContext, patient_id: UUID | str | None) -> UUID:
    target = UUID(str(patient_id)) if patient_id else ctx.require_patient()
    if ctx.role == Role.patient:
        if ctx.patient_id != target:
            raise AppError("Patients may only access their own record.", 403)
    elif ctx.role == Role.service_account:
        if ctx.patient_id and ctx.patient_id != target:
            raise AppError("Agent session is bound to a different patient.", 403)
        if ctx.patient_id is None:
            raise AppError("Agent session has no patient_id.", 403)
        target = ctx.patient_id
    elif ctx.role not in {Role.physician, Role.staff, Role.admin}:
        raise AppError("Forbidden.", 403)
    return target


def get_patient_profile(db: Session, ctx: SessionContext, args: dict[str, Any]) -> dict[str, Any]:
    patient_id = _assert_patient_scope(ctx, args.get("patient_id"))
    patient = db.scalar(
        _same_org(select(Patient), Patient, ctx.organization_id).where(Patient.id == patient_id)
    )
    if not patient:
        raise AppError("Patient not found.", 404)
    consent = db.scalar(
        select(ConsentRecord)
        .where(
            ConsentRecord.organization_id == ctx.organization_id,
            ConsentRecord.patient_id == patient.id,
            ConsentRecord.purpose == "ai_agent_handling",
            ConsentRecord.granted.is_(True),
        )
        .order_by(ConsentRecord.recorded_at.desc())
    )
    profile = {
        "id": str(patient.id),
        "first_name": patient.first_name,
        "preferred_timezone": patient.preferred_timezone,
        "specialty_hint": None,
        "has_ai_consent": consent is not None,
    }
    return {k: profile[k] for k in PATIENT_PROFILE_FIELDS}


def save_intake_information(db: Session, ctx: SessionContext, args: dict[str, Any]) -> dict[str, Any]:
    if ctx.role not in {Role.patient, Role.staff, Role.admin, Role.service_account}:
        raise AppError("Not allowed to save intake.", 403)
    patient_id = ctx.patient_id
    if patient_id is None:
        raise AppError("No patient in session.", 400)
    patient = db.get(Patient, patient_id)
    if not patient or patient.organization_id != ctx.organization_id:
        raise AppError("Patient not found.", 404)
    for field in ("first_name", "last_name", "phone", "email"):
        if args.get(field):
            setattr(patient, field, str(args[field])[:200])
    if args.get("date_of_birth"):
        patient.date_of_birth = datetime.fromisoformat(str(args["date_of_birth"])).date()
    if args.get("consent_ai_agent"):
        db.add(
            ConsentRecord(
                organization_id=ctx.organization_id,
                patient_id=patient.id,
                purpose="ai_agent_handling",
                granted=True,
                notes="Recorded during intake (MVP).",
            )
        )
    return {"ok": True, "patient_id": str(patient.id)}


def search_providers(db: Session, ctx: SessionContext, args: dict[str, Any]) -> dict[str, Any]:
    stmt = _same_org(select(Provider), Provider, ctx.organization_id).where(
        Provider.accepting_new_patients.is_(True)
    )
    slug = args.get("specialty_slug")
    q = (args.get("query") or "").lower()
    if slug:
        stmt = stmt.where(Provider.specialty_slug == slug)
    rows = db.scalars(stmt.limit(12)).all()
    if q:
        rows = [
            p
            for p in rows
            if q in p.specialty.lower()
            or q in p.last_name.lower()
            or q in p.sub_specialty.lower()
        ]
    return {
        "providers": [
            {
                "id": str(p.id),
                "name": f"{p.first_name} {p.last_name}, {p.credentials}".strip(", "),
                "specialty": p.specialty,
                "specialty_slug": p.specialty_slug,
                "office": p.office,
                "timezone": p.timezone,
            }
            for p in rows[:8]
        ]
    }


def get_provider_availability(db: Session, ctx: SessionContext, args: dict[str, Any]) -> dict[str, Any]:
    provider_id = UUID(str(args["provider_id"]))
    now = datetime.now(timezone.utc)
    slots = db.scalars(
        select(ProviderAvailability)
        .where(
            ProviderAvailability.organization_id == ctx.organization_id,
            ProviderAvailability.provider_id == provider_id,
            ProviderAvailability.is_open.is_(True),
            ProviderAvailability.start_at >= now,
        )
        .order_by(ProviderAvailability.start_at)
        .limit(20)
    ).all()
    return {
        "slots": [
            {
                "id": str(s.id),
                "start_at": s.start_at.isoformat(),
                "end_at": s.end_at.isoformat(),
                "timezone": s.timezone,
            }
            for s in slots
        ]
    }


def _lock_slot(db: Session, org_id: UUID, provider_id: UUID, start_at: datetime) -> None:
    stmt = select(Appointment.id).where(
        Appointment.organization_id == org_id,
        Appointment.provider_id == provider_id,
        Appointment.start_at == start_at,
        Appointment.status != AppointmentStatus.cancelled,
    )
    if db.get_bind().dialect.name == "postgresql":
        stmt = stmt.with_for_update()
    db.execute(stmt)


def create_appointment(db: Session, ctx: SessionContext, args: dict[str, Any]) -> dict[str, Any]:
    patient_id = _assert_patient_scope(ctx, args.get("patient_id"))
    provider_id = UUID(str(args["provider_id"]))
    start_at = datetime.fromisoformat(str(args["start_at"]).replace("Z", "+00:00"))
    end_at = datetime.fromisoformat(str(args.get("end_at") or (start_at + timedelta(minutes=30)).isoformat()))
    idempotency_key = args.get("idempotency_key") or str(uuid4())
    existing = db.scalar(
        select(Appointment).where(
            Appointment.organization_id == ctx.organization_id,
            Appointment.idempotency_key == idempotency_key,
        )
    )
    if existing:
        return {"appointment_id": str(existing.id), "idempotent": True, "status": existing.status.value}

    provider = db.get(Provider, provider_id)
    patient = db.get(Patient, patient_id)
    if not provider or provider.organization_id != ctx.organization_id:
        raise AppError("Provider not found.", 404)
    _lock_slot(db, ctx.organization_id, provider_id, start_at)
    appt = Appointment(
        organization_id=ctx.organization_id,
        patient_id=patient_id,
        provider_id=provider_id,
        start_at=start_at,
        end_at=end_at,
        provider_timezone=provider.timezone,
        patient_timezone=patient.preferred_timezone if patient else "America/New_York",
        visit_type=str(args.get("visit_type") or "in-person"),
        idempotency_key=idempotency_key,
        status=AppointmentStatus.booked,
    )
    db.add(appt)
    slot = db.scalar(
        select(ProviderAvailability).where(
            ProviderAvailability.provider_id == provider_id,
            ProviderAvailability.start_at == start_at,
        )
    )
    if slot:
        slot.is_open = False
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise AppError("That time is no longer available.", 409) from exc
    return {"appointment_id": str(appt.id), "status": appt.status.value}


def cancel_appointment(db: Session, ctx: SessionContext, args: dict[str, Any]) -> dict[str, Any]:
    appt_id = UUID(str(args["appointment_id"]))
    appt = db.get(Appointment, appt_id)
    if not appt or appt.organization_id != ctx.organization_id:
        raise AppError("Appointment not found.", 404)
    _assert_patient_scope(ctx, appt.patient_id)
    _lock_slot(db, ctx.organization_id, appt.provider_id, appt.start_at)
    appt.status = AppointmentStatus.cancelled
    appt.cancelled_at = datetime.now(timezone.utc)
    slot = db.scalar(
        select(ProviderAvailability).where(
            ProviderAvailability.provider_id == appt.provider_id,
            ProviderAvailability.start_at == appt.start_at,
        )
    )
    if slot:
        slot.is_open = True
    db.flush()
    return {"appointment_id": str(appt.id), "status": "cancelled"}


def reschedule_appointment(db: Session, ctx: SessionContext, args: dict[str, Any]) -> dict[str, Any]:
    appt_id = UUID(str(args["appointment_id"]))
    old = db.get(Appointment, appt_id)
    if not old or old.organization_id != ctx.organization_id:
        raise AppError("Appointment not found.", 404)
    _assert_patient_scope(ctx, old.patient_id)
    provider_id = str(args.get("provider_id") or old.provider_id)
    cancel_appointment(db, ctx, {"appointment_id": str(old.id)})
    created = create_appointment(
        db,
        ctx,
        {
            "patient_id": str(old.patient_id),
            "provider_id": provider_id,
            "start_at": args["start_at"],
            "end_at": args.get("end_at"),
            "visit_type": args.get("visit_type") or old.visit_type,
            "idempotency_key": args.get("idempotency_key"),
        },
    )
    new_id = UUID(str(created["appointment_id"]))
    new_appt = db.get(Appointment, new_id)
    if new_appt:
        new_appt.status = AppointmentStatus.rescheduled
    return {"cancelled_id": str(old.id), "created": created}


def send_patient_message(db: Session, ctx: SessionContext, args: dict[str, Any]) -> dict[str, Any]:
    patient_id = _assert_patient_scope(ctx, args.get("patient_id"))
    body = str(args.get("body") or "").strip()
    if not body:
        raise AppError("Message body is required.", 400)
    plan = FollowUpPlan(
        organization_id=ctx.organization_id,
        patient_id=patient_id,
        created_by_user_id=ctx.user_id,
        title="Outbound message (pending review)",
        body=body,
        status="pending_review",
    )
    db.add(plan)
    db.flush()
    msg = FollowUpMessage(
        organization_id=ctx.organization_id,
        plan_id=plan.id,
        patient_id=patient_id,
        body=body,
        status="pending_review",
    )
    db.add(msg)
    db.flush()
    return {
        "status": "pending_review",
        "message_id": str(msg.id),
        "note": "Clinically adjacent messages are not sent until staff approval.",
    }


def create_followup_plan(db: Session, ctx: SessionContext, args: dict[str, Any]) -> dict[str, Any]:
    patient_id = _assert_patient_scope(ctx, args.get("patient_id"))
    plan = FollowUpPlan(
        organization_id=ctx.organization_id,
        patient_id=patient_id,
        created_by_user_id=ctx.user_id,
        title=str(args.get("title") or "Follow-up plan")[:200],
        body=str(args.get("body") or ""),
        status="pending_review",
        scheduled_for=(
            datetime.fromisoformat(str(args["scheduled_for"]).replace("Z", "+00:00"))
            if args.get("scheduled_for")
            else None
        ),
    )
    db.add(plan)
    db.flush()
    return {
        "plan_id": str(plan.id),
        "status": "pending_review",
        "note": "Follow-up plans require clinician or staff approval before they take effect.",
    }


def record_patient_response(db: Session, ctx: SessionContext, args: dict[str, Any]) -> dict[str, Any]:
    patient_id = _assert_patient_scope(ctx, args.get("patient_id"))
    row = PatientResponse(
        organization_id=ctx.organization_id,
        patient_id=patient_id,
        plan_id=UUID(str(args["plan_id"])) if args.get("plan_id") else None,
        body=str(args.get("body") or "")[:4000],
    )
    db.add(row)
    db.flush()
    return {"response_id": str(row.id)}


def create_escalation(db: Session, ctx: SessionContext, args: dict[str, Any]) -> dict[str, Any]:
    severity_str = str(args.get("severity") or "high").lower()
    if severity_str not in EscalationSeverity.__members__.values() and severity_str not in ("low", "medium", "high", "emergency"):
        severity_str = "high"
    severity = EscalationSeverity(severity_str)
    row = Escalation(
        organization_id=ctx.organization_id,
        patient_id=ctx.patient_id,
        session_id=ctx.conversation_session_id,
        severity=severity,
        reason=str(args.get("reason") or "Unspecified"),
        status="open",
    )
    db.add(row)
    db.flush()
    return {
        "escalation_id": str(row.id),
        "status": "open",
        "instruction": "If this is an emergency, call 911. A clinician has been notified in this demo.",
    }


def verify_insurance_coverage(
    db: Session, ctx: SessionContext, args: dict[str, Any]
) -> dict[str, Any]:
    """Checks whether a patient's payer/plan is accepted by in-network providers or a specific provider."""
    payer_name = str(args.get("payer_name") or "").strip().lower()
    provider_id_raw = args.get("provider_id")

    # In-network mock directory for Gura Academic Medical Center
    ACCEPTED_PAYERS = {
        "blue cross blue shield": {"tier": "Tier 1 - Preferred", "copay_estimate": "$25"},
        "bcbs": {"tier": "Tier 1 - Preferred", "copay_estimate": "$25"},
        "aetna": {"tier": "Tier 1 - Preferred", "copay_estimate": "$30"},
        "united healthcare": {"tier": "Tier 2 - In-Network", "copay_estimate": "$40"},
        "cigna": {"tier": "Tier 2 - In-Network", "copay_estimate": "$35"},
        "medicare": {"tier": "Tier 1 - Standard Government", "copay_estimate": "$0 - $20"},
        "medicaid": {"tier": "Tier 1 - State Managed", "copay_estimate": "$0"},
    }

    if not payer_name:
        return {
            "verified": False,
            "message": "Please provide an insurance payer name (e.g., Blue Cross, Aetna, Medicare).",
            "accepted_payers": ["Blue Cross Blue Shield", "Aetna", "United Healthcare", "Cigna", "Medicare", "Medicaid"],
        }

    matched = None
    for name, details in ACCEPTED_PAYERS.items():
        if name in payer_name:
            matched = details
            break

    if matched:
        return {
            "verified": True,
            "in_network": True,
            "payer": payer_name.title(),
            "tier": matched["tier"],
            "copay_estimate": matched["copay_estimate"],
            "requires_referral": False,
            "message": f"{payer_name.title()} is in-network at Gura Hospital. Estimated copay: {matched['copay_estimate']}.",
        }

    return {
        "verified": True,
        "in_network": False,
        "payer": payer_name.title(),
        "requires_prior_auth": True,
        "message": f"{payer_name.title()} is not in our direct network. Out-of-network benefits or prior authorization may apply.",
    }


def generate_sbar_summary(
    db: Session, ctx: SessionContext, args: dict[str, Any]
) -> dict[str, Any]:
    """Generates a structured SBAR (Situation, Background, Assessment, Recommendation) clinical intake summary

    Held in PENDING_REVIEW until signed or edited by an attending clinician.
    """
    if ctx.role not in (Role.physician, Role.staff, Role.service_account, Role.admin):
        raise PermissionError("Only care team or authorized agent may generate clinical summaries.")

    patient_id_raw = args.get("patient_id") or ctx.patient_id
    if not patient_id_raw:
        raise AppError("patient_id is required to compile SBAR summary", 400)

    try:
        pid = UUID(str(patient_id_raw))
    except ValueError as exc:
        raise AppError("Invalid patient_id format", 400) from exc

    pat = (
        db.execute(
            select(Patient).where(
                Patient.organization_id == ctx.organization_id,
                Patient.id == pid,
            )
        )
        .scalars()
        .first()
    )
    if not pat:
        raise AppError("Patient not found", 404)

    symptoms = str(args.get("symptoms") or pat.notes or "Patient presented via digital navigation intake.")
    specialty = str(args.get("specialty") or pat.specialty_hint or "General Medicine")
    vitals = args.get("vitals") or {}

    sbar_text = (
        f"--- CLINICAL INTAKE DRAFT (SBAR) ---\n"
        f"PATIENT: {pat.first_name} (DOB: {pat.date_of_birth or 'On File'})\n"
        f"SITUATION: Patient initiated appointment intake for {specialty}. Stated symptoms: {symptoms}\n"
        f"BACKGROUND: Timezone {pat.preferred_timezone}. Verified in-system intake profile.\n"
        f"ASSESSMENT (PRE-CLINICAL): Non-diagnostic algorithmic triage. Vital signs noted: {vitals if vitals else 'None captured'}.\n"
        f"RECOMMENDATION: Comprehensive clinician review, formal diagnostic assessment, and personalized follow-up.\n"
        f"STATUS: PENDING CLINICIAN SIGNATURE."
    )

    return {
        "patient_id": str(pat.id),
        "sbar_note": sbar_text,
        "review_status": ReviewStatus.pending_review.value,
        "requires_clinician_signature": True,
    }


REGISTRY: dict[str, ToolFn] = {
    "get_patient_profile": get_patient_profile,
    "save_intake_information": save_intake_information,
    "search_providers": search_providers,
    "get_provider_availability": get_provider_availability,
    "create_appointment": create_appointment,
    "cancel_appointment": cancel_appointment,
    "reschedule_appointment": reschedule_appointment,
    "send_patient_message": send_patient_message,
    "create_followup_plan": create_followup_plan,
    "record_patient_response": record_patient_response,
    "create_escalation": create_escalation,
    "verify_insurance_coverage": verify_insurance_coverage,
    "generate_sbar_summary": generate_sbar_summary,
}


def invoke_tool(db: Session, ctx: SessionContext, name: str, args: dict[str, Any]) -> dict[str, Any]:
    if name not in ALLOWED_TOOLS or name not in REGISTRY:
        raise AppError(f"Unknown or disallowed tool: {name}", 400)
    limiter.check(f"tool:{ctx.user_id}:{name}", limit=30, window_seconds=60)
    limiter.check(f"tool:{ctx.user_id}:all", limit=60, window_seconds=60)
    status = review_status_for(name)
    try:
        result = REGISTRY[name](db, ctx, args or {})
    except PermissionError as exc:
        raise AppError(str(exc), 403) from exc
    summary = str(result)[:500]
    # If the tool created a record with an id, include it in arguments/payload so review handlers can identify it precisely
    payload_args = dict(args or {})
    if isinstance(result, dict):
        if "plan_id" in result:
            payload_args["plan_id"] = result["plan_id"]
        if "message_id" in result:
            payload_args["message_id"] = result["message_id"]
    _audit_action(db, ctx, name, payload_args, summary, status)
    if name in PENDING_REVIEW:
        result = {**result, "review_status": ReviewStatus.pending_review.value}
    return result
