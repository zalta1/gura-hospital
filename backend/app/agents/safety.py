"""Human-in-the-loop and clinical-safety rules.

The agent never diagnoses, never writes an EHR note, and never bypasses review
for follow-up plans or clinically adjacent outbound messages.
"""

from __future__ import annotations

from app.db.models import ReviewStatus

# Tools that execute immediately after server-side authz.
AUTO_EXECUTE = {
    "get_patient_profile",
    "save_intake_information",
    "search_providers",
    "get_provider_availability",
    "create_appointment",
    "cancel_appointment",
    "reschedule_appointment",
    "record_patient_response",
}

# Require clinician/staff approval before taking effect.
PENDING_REVIEW = {
    "create_followup_plan",
    "send_patient_message",
}

# Create the record immediately (safety), staff still triages.
NOTIFY_STAFF = {
    "create_escalation",
}

ALLOWED_TOOLS = AUTO_EXECUTE | PENDING_REVIEW | NOTIFY_STAFF

# Restricted fields for get_patient_profile (minimum necessary).
PATIENT_PROFILE_FIELDS = (
    "id",
    "first_name",
    "preferred_timezone",
    "specialty_hint",
    "has_ai_consent",
)

EMERGENCY_KEYWORDS = (
    "chest pain",
    "can't breathe",
    "cannot breathe",
    "suicidal",
    "kill myself",
    "stroke",
    "unconscious",
    "severe bleeding",
    "overdose",
)


def review_status_for(tool_name: str) -> ReviewStatus:
    if tool_name in PENDING_REVIEW:
        return ReviewStatus.pending_review
    return ReviewStatus.auto_executed


def looks_like_emergency(text: str) -> bool:
    lowered = text.lower()
    return any(k in lowered for k in EMERGENCY_KEYWORDS)
