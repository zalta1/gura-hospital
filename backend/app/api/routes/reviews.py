from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.context import SessionContext
from app.api.deps import require_roles
from app.db.models import AgentAction, FollowUpMessage, FollowUpPlan, ReviewStatus, Role
from app.db.session import get_db

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/pending")
def pending(
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(require_roles(Role.physician, Role.staff, Role.admin)),
) -> dict:
    actions = db.scalars(
        select(AgentAction)
        .where(
            AgentAction.organization_id == ctx.organization_id,
            AgentAction.review_status == ReviewStatus.pending_review,
        )
        .order_by(AgentAction.created_at.desc())
        .limit(50)
    ).all()
    return {
        "items": [
            {
                "id": str(a.id),
                "action_type": a.tool_name,
                "status": a.review_status.value,
                "summary": a.result_summary or a.tool_name,
                "payload": a.arguments,
                "created_at": a.created_at.isoformat(),
            }
            for a in actions
        ]
    }


@router.post("/{action_id}/approve")
def approve(
    action_id: UUID,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(require_roles(Role.physician, Role.staff, Role.admin)),
) -> dict:
    action = db.get(AgentAction, action_id)
    if not action or action.organization_id != ctx.organization_id:
        return {"ok": False}
    action.review_status = ReviewStatus.approved
    action.reviewed_by = ctx.user_id
    action.reviewed_at = datetime.now(timezone.utc)
    if action.tool_name == "create_followup_plan":
        plans = db.scalars(
            select(FollowUpPlan).where(
                FollowUpPlan.organization_id == ctx.organization_id,
                FollowUpPlan.status == "pending_review",
            )
        )
        for plan in plans:
            plan.status = "approved"
    if action.tool_name == "send_patient_message":
        msgs = db.scalars(
            select(FollowUpMessage).where(
                FollowUpMessage.organization_id == ctx.organization_id,
                FollowUpMessage.status == "pending_review",
            )
        )
        now = datetime.now(timezone.utc)
        for msg in msgs:
            msg.status = "sent"
            msg.sent_at = now
    return {"ok": True}


@router.post("/{action_id}/reject")
def reject(
    action_id: UUID,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(require_roles(Role.physician, Role.staff, Role.admin)),
) -> dict:
    action = db.get(AgentAction, action_id)
    if not action or action.organization_id != ctx.organization_id:
        return {"ok": False}
    action.review_status = ReviewStatus.rejected
    action.reviewed_by = ctx.user_id
    action.reviewed_at = datetime.now(timezone.utc)
    return {"ok": True}
