from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.context import SessionContext
from app.core.rate_limit import limiter
from app.core.security import as_uuid, decode_token
from app.db.models import Patient, Provider, Role, User, UserRole
from app.db.session import apply_tenant_guc, get_db

bearer = HTTPBearer(auto_error=False)


def _context_from_payload(db: Session, payload: dict) -> SessionContext:
    user_id = as_uuid(payload.get("sub"))
    org_id = as_uuid(payload.get("org"))
    role = Role(payload.get("role", "patient"))
    if not user_id or not org_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token.")
    apply_tenant_guc(db, str(org_id), role.value)
    patient_id = as_uuid(payload.get("patient_id"))
    provider_id = as_uuid(payload.get("provider_id"))
    if patient_id is None:
        patient_id = db.scalar(
            select(Patient.id).where(Patient.user_id == user_id, Patient.organization_id == org_id)
        )
    if provider_id is None:
        provider_id = db.scalar(
            select(Provider.id).where(Provider.user_id == user_id, Provider.organization_id == org_id)
        )
    return SessionContext(
        user_id=user_id,
        organization_id=org_id,
        role=role,
        patient_id=patient_id,
        provider_id=provider_id,
        is_agent=role == Role.service_account,
    )


def get_current_context(
    db: Session = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    x_api_token: str | None = Header(default=None, alias="X-API-Token"),
) -> SessionContext:
    token = creds.credentials if creds else x_api_token
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated.")
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc)) from exc
    ctx = _context_from_payload(db, payload)
    limiter.check(f"api:{ctx.user_id}", limit=120, window_seconds=60)
    return ctx


def require_roles(*roles: Role):
    def dep(ctx: SessionContext = Depends(get_current_context)) -> SessionContext:
        if ctx.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role.")
        return ctx

    return dep


def optional_context(
    db: Session = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> SessionContext | None:
    if not creds:
        return None
    try:
        return _context_from_payload(db, decode_token(creds.credentials))
    except Exception:
        return None
