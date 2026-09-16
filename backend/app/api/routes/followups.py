from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.agents.context import SessionContext
from app.agents.tools import invoke_tool
from app.api.deps import get_current_context, require_roles
from app.api.schemas import FollowUpCreateRequest, FollowUpSendRequest, PatientResponseRequest
from app.db.models import Role
from app.db.session import get_db

router = APIRouter(tags=["followups"])


@router.post("/followup-plans")
def create_plan(
    body: FollowUpCreateRequest,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(
        require_roles(Role.physician, Role.staff, Role.admin, Role.service_account)
    ),
) -> dict:
    return invoke_tool(db, ctx, "create_followup_plan", body.model_dump(mode="json"))


@router.post("/followup-messages")
def send_message(
    body: FollowUpSendRequest,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(
        require_roles(Role.physician, Role.staff, Role.admin, Role.service_account)
    ),
) -> dict:
    return invoke_tool(db, ctx, "send_patient_message", body.model_dump(mode="json"))


@router.post("/patient-responses")
def record_response(
    body: PatientResponseRequest,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(get_current_context),
) -> dict:
    return invoke_tool(db, ctx, "record_patient_response", body.model_dump(mode="json"))
