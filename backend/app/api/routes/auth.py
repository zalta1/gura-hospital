from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_context
from app.api.schemas import DemoLoginRequest, LoginRequest, TokenResponse
from app.agents.context import SessionContext
from app.core.errors import AppError
from app.core.security import create_access_token, verify_password
from app.db.models import Organization, Patient, Provider, Role, User, UserRole
from app.db.session import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_for(db: Session, user: User, role: Role) -> TokenResponse:
    patient_id = db.scalar(select(Patient.id).where(Patient.user_id == user.id))
    provider_id = db.scalar(select(Provider.id).where(Provider.user_id == user.id))
    token = create_access_token(
        {
            "sub": str(user.id),
            "org": str(user.organization_id),
            "role": role.value,
            "patient_id": str(patient_id) if patient_id else None,
            "provider_id": str(provider_id) if provider_id else None,
        }
    )
    return TokenResponse(
        access_token=token,
        role=role.value,
        user_id=user.id,
        organization_id=user.organization_id,
        patient_id=patient_id,
        provider_id=provider_id,
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise AppError("Invalid email or password.", 401)
    role_row = db.scalar(select(UserRole).where(UserRole.user_id == user.id))
    role = role_row.role if role_row else Role.patient
    return _token_for(db, user, role)


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(body: DemoLoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    """Hackathon helper — maps a persona to a seeded account. TODO: disable in production."""
    emails = {
        "patient": "jordan.avery@patient.example",
        "physician": "amara.velloso@gura.example",
        "staff": "priya.nair@gura.example",
        "admin": "admin@gura.example",
    }
    user = db.scalar(select(User).where(User.email == emails[body.persona]))
    if not user:
        raise AppError("Seed data is missing. Run: python -m app.seed", 503)
    role = Role(body.persona if body.persona != "admin" else "admin")
    if body.persona == "staff":
        role = Role.staff
    return _token_for(db, user, role)


@router.get("/me")
def me(ctx: SessionContext = Depends(get_current_context)) -> dict:
    return {
        "user_id": str(ctx.user_id),
        "organization_id": str(ctx.organization_id),
        "role": ctx.role.value,
        "patient_id": str(ctx.patient_id) if ctx.patient_id else None,
        "provider_id": str(ctx.provider_id) if ctx.provider_id else None,
    }
