from datetime import datetime, timezone
from typing import Any
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.agents.context import SessionContext
from app.api.deps import get_current_context, require_roles
from app.core.config import get_settings
from app.core.errors import AppError
from app.db.models import PatientIntakeCall, Role
from app.db.session import get_db

router = APIRouter(prefix="/intake", tags=["intake-voice"])

INTAKE_FIELDS = (
    "full_name",
    "date_of_birth",
    "email",
    "phone",
    "reason_for_visit",
    "preferred_specialty",
    "insurance",
    "visit_preference",
)


class IntakeCallPatch(BaseModel):
    full_name: str | None = Field(default=None, max_length=160)
    date_of_birth: str | None = Field(default=None, max_length=20)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=40)
    reason_for_visit: str | None = Field(default=None, max_length=4000)
    preferred_specialty: str | None = Field(default=None, max_length=80)
    insurance: str | None = Field(default=None, max_length=120)
    visit_preference: str | None = Field(default=None, max_length=40)
    transcript_append: dict[str, Any] | None = None
    elevenlabs_conversation_id: str | None = Field(default=None, max_length=80)


def _serialize(row: PatientIntakeCall) -> dict[str, Any]:
    return {
        "call_id": str(row.id),
        "full_name": row.full_name,
        "date_of_birth": row.date_of_birth,
        "email": row.email,
        "phone": row.phone,
        "reason_for_visit": row.reason_for_visit,
        "preferred_specialty": row.preferred_specialty,
        "insurance": row.insurance,
        "visit_preference": row.visit_preference,
        "transcript": row.transcript or [],
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


def _get_call(db: Session, ctx: SessionContext, call_id: UUID) -> PatientIntakeCall:
    row = db.get(PatientIntakeCall, call_id)
    if not row or row.organization_id != ctx.organization_id:
        raise AppError("Call not found.", 404)
    return row


@router.post("/calls")
def create_call(
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(
        require_roles(Role.patient, Role.staff, Role.admin, Role.service_account)
    ),
) -> dict:
    row = PatientIntakeCall(organization_id=ctx.organization_id, status="in_progress", transcript=[])
    db.add(row)
    db.flush()
    return _serialize(row)


@router.patch("/calls/{call_id}")
def update_call(
    call_id: UUID,
    body: IntakeCallPatch,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(get_current_context),
) -> dict:
    row = _get_call(db, ctx, call_id)
    data = body.model_dump(exclude_none=True)
    append = data.pop("transcript_append", None)
    for key, value in data.items():
        if key in INTAKE_FIELDS or key == "elevenlabs_conversation_id":
            setattr(row, key, value)
    if append:
        history = list(row.transcript or [])
        history.append(append)
        row.transcript = history[-200:]
    row.updated_at = datetime.now(timezone.utc)
    db.flush()
    return _serialize(row)


@router.post("/calls/{call_id}/end")
def end_call(
    call_id: UUID,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(get_current_context),
) -> dict:
    row = _get_call(db, ctx, call_id)
    row.status = "pending_navigator_review"
    row.updated_at = datetime.now(timezone.utc)
    db.flush()
    return _serialize(row)


@router.get("/voice/signed-url")
def signed_url(
    ctx: SessionContext = Depends(
        require_roles(Role.patient, Role.staff, Role.admin, Role.service_account)
    ),
) -> dict:
    settings = get_settings()
    if not settings.elevenlabs_api_key or not settings.elevenlabs_agent_id:
        raise AppError(
            "Voice navigator is not configured. Set ELEVENLABS_API_KEY and ELEVENLABS_AGENT_ID.",
            503,
        )
    url = "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url"
    try:
        with httpx.Client(timeout=15) as client:
            res = client.get(
                url,
                params={"agent_id": settings.elevenlabs_agent_id},
                headers={"xi-api-key": settings.elevenlabs_api_key},
            )
    except httpx.HTTPError as exc:
        raise AppError("Could not reach ElevenLabs.", 502) from exc
    if not res.is_success:
        raise AppError("ElevenLabs signed URL failed. Check agent ID and API key.", 502)
    payload = res.json()
    signed = payload.get("signed_url") or payload.get("signedUrl")
    if not signed:
        raise AppError("ElevenLabs did not return a signed_url.", 502)
    return {"signed_url": signed, "agent_id": settings.elevenlabs_agent_id}
