from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class DemoLoginRequest(BaseModel):
    persona: str = Field(pattern="^(patient|physician|staff|admin)$")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: UUID
    organization_id: UUID
    patient_id: UUID | None = None
    provider_id: UUID | None = None


class IntakeStartRequest(BaseModel):
    channel: str = "web_chat"
    reason_for_visit: str | None = Field(default=None, max_length=2000)
    preferred_specialty: str | None = Field(default=None, max_length=80)
    insurance_provider: str | None = Field(default=None, max_length=120)
    visit_preference: str | None = Field(default=None, max_length=40)
    first_name: str | None = Field(default=None, max_length=80)
    last_name: str | None = Field(default=None, max_length=80)
    date_of_birth: str | None = None
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=40)
    consent_ai_agent: bool = False


class ChatMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class AppointmentCreateRequest(BaseModel):
    provider_id: UUID
    start_at: datetime
    end_at: datetime | None = None
    visit_type: str = "in-person"
    idempotency_key: str | None = Field(default=None, max_length=80)
    patient_id: UUID | None = None


class FollowUpCreateRequest(BaseModel):
    title: str = Field(max_length=200)
    body: str = Field(max_length=8000)
    scheduled_for: datetime | None = None
    patient_id: UUID | None = None


class FollowUpSendRequest(BaseModel):
    body: str = Field(max_length=4000)
    patient_id: UUID | None = None


class PatientResponseRequest(BaseModel):
    body: str = Field(max_length=4000)
    plan_id: UUID | None = None


class EscalationCreateRequest(BaseModel):
    reason: str = Field(max_length=2000)
    severity: str = "medium"
    patient_id: UUID | None = None
