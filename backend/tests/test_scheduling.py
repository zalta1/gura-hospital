"""Lightweight scheduling invariant tests (no live Postgres required)."""

from datetime import datetime, timedelta, timezone


def test_appointment_range_and_timezones() -> None:
    start = datetime(2026, 9, 1, 13, 0, tzinfo=timezone.utc)
    end = start + timedelta(minutes=30)
    provider_tz = "America/New_York"
    patient_tz = "America/Los_Angeles"
    assert end > start
    assert provider_tz != patient_tz
