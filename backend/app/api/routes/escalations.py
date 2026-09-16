from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.context import SessionContext
from app.agents.tools import invoke_tool
from app.api.deps import get_current_context, require_roles
from app.api.schemas import EscalationCreateRequest
from app.db.models import Escalation, Role
from app.db.session import get_db

router = APIRouter(prefix="/escalations", tags=["escalations"])


@router.post("")
def create(
    body: EscalationCreateRequest,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(get_current_context),
) -> dict:
    return invoke_tool(db, ctx, "create_escalation", body.model_dump(mode="json"))


@router.get("")
def list_escalations(
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(require_roles(Role.physician, Role.staff, Role.admin)),
) -> dict:
    rows = db.scalars(
        select(Escalation)
        .where(Escalation.organization_id == ctx.organization_id)
        .order_by(Escalation.created_at.desc())
        .limit(100)
    ).all()
    return {
        "escalations": [
            {
                "id": str(e.id),
                "severity": e.severity.value,
                "reason": e.reason,
                "status": e.status,
                "created_at": e.created_at.isoformat(),
            }
            for e in rows
        ]
    }


@router.post("/{escalation_id}/review")
def review(
    escalation_id: UUID,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(require_roles(Role.physician, Role.staff, Role.admin)),
) -> dict:
    row = db.get(Escalation, escalation_id)
    if not row or row.organization_id != ctx.organization_id:
        return {"ok": False}
    row.status = "reviewed"
    row.reviewed_by = ctx.user_id
    return {"ok": True, "id": str(row.id)}
