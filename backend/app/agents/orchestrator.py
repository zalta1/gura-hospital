"""Keyword-driven intake agent (mock LLM).

TODO(clinical validation): replace with a constrained, evaluated clinical LLM
and keep the same tool interface so agents do not change when EHR adapters swap.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.agents.context import SessionContext
from app.agents.safety import (
    detect_adversarial_intent,
    evaluate_triage,
    looks_like_emergency,
    sanitize_phi_pii,
)
from app.agents.tools import invoke_tool
from app.core.config import get_settings
from app.db.models import ConversationMessage

SPECIALTY_KEYWORDS = {
    "cardiology-electrophysiology": ["chest", "heart", "palpitation", "blood pressure", "afib"],
    "gastroenterology": ["stomach", "abdominal", "reflux", "heartburn", "liver", "colon"],
    "orthopedics": ["knee", "hip", "shoulder", "back", "joint", "fracture", "sprain"],
    "neurology": ["headache", "migraine", "seizure", "numbness", "dizzy", "stroke", "tremor"],
    "womens-health": ["pregnan", "prenatal", "menopause", "pelvic", "fibroid"],
    "primary-care": ["physical", "checkup", "cold", "flu", "fatigue", "diabetes", "thyroid"],
}

DISCLAIMER = (
    "I am a navigation assistant, not a clinician. I do not diagnose. "
    "A licensed professional remains responsible for your care. "
    "For emergencies, call 911."
)


def _append(db: Session, ctx: SessionContext, role: str, content: str) -> None:
    db.add(
        ConversationMessage(
            organization_id=ctx.organization_id,
            session_id=ctx.conversation_session_id,
            user_id=ctx.user_id,
            role=role,
            content=content,
        )
    )


def _guess_specialty(text: str) -> str:
    lowered = text.lower()
    scored = [
        (slug, sum(1 for w in words if w in lowered))
        for slug, words in SPECIALTY_KEYWORDS.items()
    ]
    scored.sort(key=lambda x: x[1], reverse=True)
    if scored and scored[0][1] > 0:
        return scored[0][0]
    return "primary-care"


def handle_user_message(db: Session, ctx: SessionContext, text: str) -> str:
    _append(db, ctx, "user", text)
    settings = get_settings()

    # 1. Guardrail against prompt injection & unauthorized prescription requests
    is_adversarial, reason = detect_adversarial_intent(text)
    if is_adversarial:
        reply = (
            "I cannot fulfill requests to alter safety instructions, write prescriptions, or provide clinical diagnoses. "
            "I am programmed solely to assist with clinic navigation, provider directories, and appointment scheduling. "
            + DISCLAIMER
        )
        _append(db, ctx, "assistant", reply)
        return reply

    # 2. Comprehensive clinical triage assessment (ESI 1-5)
    triage = evaluate_triage(text)
    if triage.is_emergency:
        invoke_tool(
            db,
            ctx,
            "create_escalation",
            {
                "severity": "emergency",
                "reason": f"[{triage.triage_level.value}] {text[:450]}",
            },
        )
        reply = (
            "Your message describes symptoms that require immediate medical attention. "
            "Please call 911 or go to the nearest emergency department immediately. "
            "A high-priority triage alert has been dispatched to our on-call clinical team. "
            + DISCLAIMER
        )
        _append(db, ctx, "assistant", reply)
        return reply

    # 3. Handle urgent non-emergency symptoms (ESI-3)
    urgent_prefix = ""
    if triage.triage_level.value == "esi_3_urgent_care":
        invoke_tool(
            db,
            ctx,
            "create_escalation",
            {
                "severity": "urgent",
                "reason": f"[{triage.triage_level.value}] {text[:450]}",
            },
        )
        urgent_prefix = (
            "Your symptoms indicate you may benefit from urgent or same-day clinical evaluation. "
            "We have notified our triage desk. "
        )

    specialty = _guess_specialty(text)
    matches = invoke_tool(db, ctx, "search_providers", {"specialty_slug": specialty})
    names = ", ".join(p["name"] for p in matches.get("providers", [])[:3]) or "our primary care team"
    reply = (
        f"{urgent_prefix}Based on what you shared, {specialty.replace('-', ' ')} is a reasonable specialty to review — "
        f"not a diagnosis. Providers who may be a fit: {names}. "
        "I can look at open times, check insurance coverage, or draft a follow-up plan for staff to approve. "
        f"{DISCLAIMER}"
    )
    if settings.openai_api_key:
        # PII sanitized before external transmission
        clean_text = sanitize_phi_pii(text)
        reply = _maybe_llm_reply(clean_text, specialty, names) or reply

    _append(db, ctx, "assistant", reply)
    return reply


def _maybe_llm_reply(user_text: str, specialty: str, names: str) -> str | None:
    try:
        import httpx

        settings = get_settings()
        payload: dict[str, Any] = {
            "model": settings.openai_model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are Gura Hospital's care navigation agent. Do not diagnose. "
                        "Do not claim to be a doctor. Suggest specialties only. "
                        + DISCLAIMER
                    ),
                },
                {
                    "role": "user",
                    "content": f"Patient said: {user_text}\nSuggested specialty slug: {specialty}\nProviders: {names}",
                },
            ],
        }
        with httpx.Client(timeout=20) as client:
            res = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                json=payload,
            )
            res.raise_for_status()
            return res.json()["choices"][0]["message"]["content"]
    except Exception:
        return None
