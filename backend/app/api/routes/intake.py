from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.agents.context import SessionContext
from app.agents.orchestrator import handle_user_message
from app.agents.tools import invoke_tool
from app.api.deps import get_current_context, require_roles
from app.api.schemas import ChatMessageRequest, IntakeStartRequest
from app.db.models import ConversationSession, Role
from app.db.session import get_db
from app.ehr.mock import mock_ehr

router = APIRouter(prefix="/intake", tags=["intake"])


@router.post("/sessions")
def start_session(
    body: IntakeStartRequest,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(
        require_roles(Role.patient, Role.staff, Role.admin, Role.service_account)
    ),
) -> dict:
    session = ConversationSession(
        organization_id=ctx.organization_id,
        patient_id=ctx.patient_id,
        user_id=ctx.user_id,
        channel=body.channel,
    )
    db.add(session)
    db.flush()
    ctx.conversation_session_id = session.id
    if body.first_name or body.reason_for_visit:
        invoke_tool(
            db,
            ctx,
            "save_intake_information",
            body.model_dump(exclude_none=True),
        )
        if ctx.patient_id:
            mock_ehr.upsert_patient({"patient_id": str(ctx.patient_id), "email": body.email})
    return {"session_id": str(session.id), "websocket_path": f"/ws/intake/{session.id}"}


@router.post("/sessions/{session_id}/messages")
def post_message(
    session_id: UUID,
    body: ChatMessageRequest,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(get_current_context),
) -> dict:
    ctx.conversation_session_id = session_id
    reply = handle_user_message(db, ctx, body.content)
    return {"reply": reply}
