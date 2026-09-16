from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.jobs.scheduler import process_due_followups

_scheduler: BackgroundScheduler | None = None


def start_scheduler() -> None:
    """Background reminders. Disabled on SQLite — native threads crash uvicorn on Windows."""
    global _scheduler
    if _scheduler:
        return
    if get_settings().database_url.startswith("sqlite"):
        return
    _scheduler = BackgroundScheduler()

    def tick() -> None:
        db = SessionLocal()
        try:
            process_due_followups(db)
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()

    _scheduler.add_job(tick, "interval", minutes=1, id="followups")
    _scheduler.start()
