from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.db.models import Role


@dataclass
class SessionContext:
    user_id: UUID
    organization_id: UUID
    role: Role
    patient_id: UUID | None = None
    provider_id: UUID | None = None
    conversation_session_id: UUID | None = None
    is_agent: bool = False

    def require_patient(self) -> UUID:
        if self.patient_id is None:
            raise PermissionError("This action requires a patient in session context.")
        return self.patient_id
