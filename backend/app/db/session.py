from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from sqlalchemy.pool import NullPool

from app.core.config import get_settings

settings = get_settings()
_engine_kwargs: dict = {"future": True}
if settings.database_url.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
    _engine_kwargs["poolclass"] = NullPool
else:
    _engine_kwargs["pool_pre_ping"] = True

engine = create_engine(settings.database_url, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def apply_tenant_guc(db: Session, organization_id: str, role: str) -> None:
    """Sets PostgreSQL session variables used by RLS policies. No-op on SQLite."""
    if db.get_bind().dialect.name != "postgresql":
        return
    db.execute(text("SELECT set_config('app.current_org_id', :org, true)"), {"org": organization_id})
    db.execute(text("SELECT set_config('app.current_role', :role, true)"), {"role": role})
