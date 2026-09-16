from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

from app.agents.context import SessionContext
from app.agents.safety import looks_like_emergency, review_status_for
from app.db.models import ReviewStatus, Role
from app.core.rate_limit import SlidingWindowLimiter
from app.core.errors import AppError


def test_emergency_keywords() -> None:
    assert looks_like_emergency("I have severe chest pain")
    assert not looks_like_emergency("I need a routine physical")


def test_hitl_rules() -> None:
    assert review_status_for("create_followup_plan") == ReviewStatus.pending_review
    assert review_status_for("send_patient_message") == ReviewStatus.pending_review
    assert review_status_for("get_patient_profile") == ReviewStatus.auto_executed
    assert review_status_for("create_appointment") == ReviewStatus.auto_executed


def test_patient_cannot_read_other_profile(monkeypatch) -> None:
    from app.agents import tools

    ctx = SessionContext(
        user_id=uuid4(),
        organization_id=uuid4(),
        role=Role.patient,
        patient_id=uuid4(),
    )
    other = uuid4()
    with pytest.raises(AppError):
        tools._assert_patient_scope(ctx, other)


def test_agent_bound_to_session_patient() -> None:
    from app.agents import tools

    pid = uuid4()
    ctx = SessionContext(
        user_id=uuid4(),
        organization_id=uuid4(),
        role=Role.service_account,
        patient_id=pid,
    )
    assert tools._assert_patient_scope(ctx, pid) == pid
    with pytest.raises(AppError):
        tools._assert_patient_scope(ctx, uuid4())


def test_tool_rate_limiter() -> None:
    lim = SlidingWindowLimiter()
    for _ in range(3):
        lim.check("k", limit=3, window_seconds=60)
    with pytest.raises(Exception):
        lim.check("k", limit=3, window_seconds=60)


def test_profile_fields_are_restricted() -> None:
    from app.agents.safety import PATIENT_PROFILE_FIELDS

    assert "email" not in PATIENT_PROFILE_FIELDS
    assert "mrn" not in PATIENT_PROFILE_FIELDS
    assert "date_of_birth" not in PATIENT_PROFILE_FIELDS
    assert "first_name" in PATIENT_PROFILE_FIELDS
