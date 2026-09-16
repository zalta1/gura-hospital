from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.agents.context import SessionContext
from app.agents.tools import invoke_tool
from app.api.deps import get_current_context
from app.db.session import get_db

router = APIRouter(prefix="/providers", tags=["providers"])


@router.get("/matches")
def matches(
    specialty: str | None = Query(default=None),
    q: str | None = Query(default=None),
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(get_current_context),
) -> dict:
    return invoke_tool(
        db,
        ctx,
        "search_providers",
        {"specialty_slug": specialty, "query": q},
    )


@router.get("/{provider_id}/availability")
def availability(
    provider_id: UUID,
    db: Session = Depends(get_db),
    ctx: SessionContext = Depends(get_current_context),
) -> dict:
    return invoke_tool(db, ctx, "get_provider_availability", {"provider_id": str(provider_id)})
