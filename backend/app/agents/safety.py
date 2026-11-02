"""Human-in-the-loop, clinical safety, triage classification, and PII sanitization.

The agent never diagnoses, never writes unverified EHR notes, and never bypasses review
for follow-up plans, diagnostic opinions, or clinically adjacent outbound messages.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Any, NamedTuple

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
    "verify_insurance_coverage",
}

# Require clinician/staff approval before taking effect.
PENDING_REVIEW = {
    "create_followup_plan",
    "send_patient_message",
    "generate_sbar_summary",
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


class TriageLevel(str, Enum):
    """Emergency Severity Index (ESI) mapped classification levels."""

    ESI_1_RESUSCITATION = "esi_1_immediate_life_threat"
    ESI_2_EMERGENT = "esi_2_emergent_high_risk"
    ESI_3_URGENT = "esi_3_urgent_care"
    ESI_4_LESS_URGENT = "esi_4_routine_care"
    ESI_5_NON_URGENT = "esi_5_administrative"


class TriageAssessment(NamedTuple):
    is_emergency: bool
    triage_level: TriageLevel
    matched_patterns: list[str]
    suggested_action: str


# Comprehensive emergency patterns covering cardiology, neurology, respiratory,
# severe bleeding, psychiatric emergencies, anaphylaxis, and pediatric distress.
EMERGENCY_REGEX_PATTERNS = [
    # Cardiac & Vascular
    r"\b(chest\s+(pain|tightness|pressure)|crushing\s+(chest\s+)?pressure|radiating\s+pain|heart\s+attack|myocardial)\b",
    r"\b(irregular\s+heartbeat|heart\s+racing|severe\s+palpitations|aortic)\b",
    # Respiratory & Airway
    r"\b(can'?t\s+breathe|cannot\s+breathe|shortness\s+of\s+breath|gasping|choking|asphyxi|stridor)\b",
    r"\b(lips?\s+turning\s+blue|cyanosis|throat\s+closing|anaphylax)\b",
    # Neurological & Stroke (FAST criteria)
    r"\b(stroke|facial\s+droop|arm\s+weakness|slurred\s+speech|sudden\s+numbness)\b",
    r"\b(worst\s+headache\s+of\s+life|thunderclap\s+headache|loss\s+of\s+consciousness|unconscious|passed\s+out|fainted|blackout)\b",
    r"\b(seizure|convulsion|unresponsive)\b",
    # Psychiatric / Crisis
    r"\b(suicid|kill\s+myself|end\s+my\s+life|hurt\s+myself|want\s+to\s+die|self\s*harm)\b",
    # Severe Trauma / Toxicity / Shock
    r"\b(severe\s+bleeding|uncontrolled\s+bleeding|coughing\s+up\s+blood|vomiting\s+blood)\b",
    r"\b(overdose|poison|swallowed\s+chemicals|ingested\s+bleach)\b",
]

# Patterns that suggest urgent care or same-day review (ESI-3) rather than immediate ER.
URGENT_REGEX_PATTERNS = [
    r"\b(high\s+fever|fever\s+(over|>)\s*10[2-5]|chills\s+and\s+shaking)\b",
    r"\b(severe\s+abdominal\s+pain|acute\s+stomach\s+pain|appendicitis)\b",
    r"\b(possible\s+fracture|broken\s+bone|cannot\s+walk|dislocated)\b",
    r"\b(deep\s+cut|wound\s+needing\s+stitches|animal\s+bite)\b",
    r"\b(severe\s+allergic\s+reaction|widespread\s+rash|hives\s+spreading)\b",
]

# Prompt injection & jailbreak patterns to defend against adversarial manipulation
PROMPT_INJECTION_PATTERNS = [
    r"\b(ignore\s+(all\s+)?(previous|prior|above)\s+instructions?)\b",
    r"\b(system\s+prompt|reveal\s+(your|the)\s+prompt|developer\s+mode|dan\s+mode)\b",
    r"\b(prescribe\s+me|write\s+(a\s+)?prescription\s+for|give\s+me\s+a\s+rx)\b",
    r"\b(act\s+as\s+a\s+licensed\s+(doctor|physician|surgeon)\s+and\s+diagnose)\b",
]


def review_status_for(tool_name: str) -> ReviewStatus:
    if tool_name in PENDING_REVIEW:
        return ReviewStatus.pending_review
    return ReviewStatus.auto_executed


def evaluate_triage(text: str) -> TriageAssessment:
    """Evaluates input text against clinical triage patterns and assigns an ESI category."""
    lowered = text.lower()
    matched_emergencies = [
        pattern for pattern in EMERGENCY_REGEX_PATTERNS
        if re.search(pattern, lowered)
    ]

    if matched_emergencies:
        return TriageAssessment(
            is_emergency=True,
            triage_level=TriageLevel.ESI_1_RESUSCITATION,
            matched_patterns=matched_emergencies,
            suggested_action="Immediate 911 activation / nearest Emergency Department. Triage alert dispatched.",
        )

    matched_urgencies = [
        pattern for pattern in URGENT_REGEX_PATTERNS
        if re.search(pattern, lowered)
    ]
    if matched_urgencies:
        return TriageAssessment(
            is_emergency=False,
            triage_level=TriageLevel.ESI_3_URGENT,
            matched_patterns=matched_urgencies,
            suggested_action="Urgent care evaluation or same-day clinical review recommended.",
        )

    return TriageAssessment(
        is_emergency=False,
        triage_level=TriageLevel.ESI_4_LESS_URGENT,
        matched_patterns=[],
        suggested_action="Routine clinical navigation and outpatient scheduling.",
    )


def looks_like_emergency(text: str) -> bool:
    """Retains backwards compatibility with existing checks while leveraging full regex coverage."""
    return evaluate_triage(text).is_emergency


def detect_adversarial_intent(text: str) -> tuple[bool, str | None]:
    """Detects prompt injection attempts, system prompt extraction, or illegal prescribing requests."""
    lowered = text.lower()
    for pattern in PROMPT_INJECTION_PATTERNS:
        match = re.search(pattern, lowered)
        if match:
            return True, match.group(0)
    return False, None


def sanitize_phi_pii(text: str) -> str:
    """Scrubs Social Security Numbers, Medical Record Numbers, phone numbers, and emails

    Ensures data sent to external cloud LLMs satisfies de-identification principles.
    """
    # SSN: XXX-XX-XXXX or 9 consecutive digits
    scrubbed = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED_SSN]", text)

    # Phone numbers (US formats)
    scrubbed = re.sub(
        r"(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b",
        "[REDACTED_PHONE]",
        scrubbed,
    )

    # Email addresses
    scrubbed = re.sub(
        r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b",
        "[REDACTED_EMAIL]",
        scrubbed,
    )

    # Medical Record Number / Patient Account markers: e.g. MRN: 1234567, MRN# 12345
    scrubbed = re.sub(
        r"\b(mrn|medical\s+record|record\s*#)[\s:#]+[A-Za-z0-9-]+\b",
        "[REDACTED_MRN]",
        scrubbed,
        flags=re.IGNORECASE,
    )

    return scrubbed
