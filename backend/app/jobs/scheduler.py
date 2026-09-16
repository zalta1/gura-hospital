from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import FollowUpMessage, FollowUpPlan


def process_due_followups(db: Session) -> int:
    """Send approved follow-ups whose scheduled_for is due. MOCK delivery (log only)."""
    now = datetime.now(timezone.utc)
    plans = db.scalars(
        select(FollowUpPlan).where(
            FollowUpPlan.status == "approved",
            FollowUpPlan.scheduled_for.is_not(None),
            FollowUpPlan.scheduled_for <= now,
        )
    ).all()
    count = 0
    for plan in plans:
        msg = FollowUpMessage(
            organization_id=plan.organization_id,
            plan_id=plan.id,
            patient_id=plan.patient_id,
            body=plan.body,
            status="sent",
            sent_at=now,
        )
        db.add(msg)
        plan.status = "sent"
        count += 1
    return count
