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

    # Strictly isolate approval to the exact record created or requested by this action.
    # Never cascade to all records across the entire hospital!
    target_plan_id = action.arguments.get("plan_id") if isinstance(action.arguments, dict) else None
    target_msg_id = action.arguments.get("message_id") if isinstance(action.arguments, dict) else None

    if action.tool_name == "create_followup_plan":
        if target_plan_id:
            try:
                plan = db.scalar(
                    select(FollowUpPlan).where(
                        FollowUpPlan.organization_id == ctx.organization_id,
                        FollowUpPlan.id == UUID(str(target_plan_id)),
                    )
                )
                if plan:
                    plan.status = "approved"
            except (ValueError, TypeError):
                pass
        else:
            # Fallback to session boundary rather than tenant-wide
            if action.session_id:
                plans = db.scalars(
                    select(FollowUpPlan).where(
                        FollowUpPlan.organization_id == ctx.organization_id,
                        FollowUpPlan.created_by_user_id == action.user_id,
                        FollowUpPlan.status == "pending_review",
                    )
                )
                for p in plans:
                    p.status = "approved"

    if action.tool_name == "send_patient_message":
        now = datetime.now(timezone.utc)
        if target_msg_id:
            try:
                msg = db.scalar(
                    select(FollowUpMessage).where(
                        FollowUpMessage.organization_id == ctx.organization_id,
                        FollowUpMessage.id == UUID(str(target_msg_id)),
                    )
                )
                if msg:
                    msg.status = "sent"
                    msg.sent_at = now
            except (ValueError, TypeError):
                pass
        else:
            if action.session_id:
                msgs = db.scalars(
                    select(FollowUpMessage).where(
                        FollowUpMessage.organization_id == ctx.organization_id,
                        FollowUpMessage.user_id == action.user_id,
                        FollowUpMessage.status == "pending_review",
                    )
                )
                for m in msgs:
                    m.status = "sent"
                    m.sent_at = now

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

    target_plan_id = action.arguments.get("plan_id") if isinstance(action.arguments, dict) else None
    target_msg_id = action.arguments.get("message_id") if isinstance(action.arguments, dict) else None

    if action.tool_name == "create_followup_plan" and target_plan_id:
        try:
            plan = db.scalar(
                select(FollowUpPlan).where(
                    FollowUpPlan.organization_id == ctx.organization_id,
                    FollowUpPlan.id == UUID(str(target_plan_id)),
                )
            )
            if plan:
                plan.status = "rejected"
        except (ValueError, TypeError):
            pass

    if action.tool_name == "send_patient_message" and target_msg_id:
        try:
            msg = db.scalar(
                select(FollowUpMessage).where(
                    FollowUpMessage.organization_id == ctx.organization_id,
                    FollowUpMessage.id == UUID(str(target_msg_id)),
                )
            )
            if msg:
                msg.status = "rejected"
        except (ValueError, TypeError):
            pass

    return {"ok": True}
