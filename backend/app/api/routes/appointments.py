from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.context import SessionContext
from app.agents.tools import invoke_tool
from app.api.deps import get_current_context, require_roles
from app.api.schemas import AppointmentCreateRequest
from app.db.models import Appointment, Role
from app.db.session import get_db

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.get("")
def list_appointments(
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(get_current_context),
) -> dict:
    stmt = select(Appointment).where(Appointment.organization_id == ctx.organization_id)
    if ctx.role == Role.patient and ctx.patient_id:
        stmt = stmt.where(Appointment.patient_id == ctx.patient_id)
    elif ctx.role == Role.physician and ctx.provider_id:
        stmt = stmt.where(Appointment.provider_id == ctx.provider_id)
    rows = db.scalars(stmt.order_by(Appointment.start_at.desc()).limit(100)).all()
    return {
        "appointments": [
            {
                "id": str(a.id),
                "patient_id": str(a.patient_id),
                "provider_id": str(a.provider_id),
                "start_at": a.start_at.isoformat(),
                "end_at": a.end_at.isoformat(),
                "provider_timezone": a.provider_timezone,
                "patient_timezone": a.patient_timezone,
                "status": a.status.value,
            }
            for a in rows
        ]
    }


@router.post("")
def create(
    body: AppointmentCreateRequest,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(get_current_context),
) -> dict:
    return invoke_tool(db, ctx, "create_appointment", body.model_dump(mode="json"))


@router.post("/{appointment_id}/cancel")
def cancel(
    appointment_id: UUID,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(get_current_context),
) -> dict:
    return invoke_tool(db, ctx, "cancel_appointment", {"appointment_id": str(appointment_id)})


@router.post("/{appointment_id}/reschedule")
def reschedule(
    appointment_id: UUID,
    body: AppointmentCreateRequest,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(get_current_context),
) -> dict:
    payload = body.model_dump(mode="json")
    payload["appointment_id"] = str(appointment_id)
    return invoke_tool(db, ctx, "reschedule_appointment", payload)
