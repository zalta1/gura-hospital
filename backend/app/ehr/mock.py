"""MOCK EHR — synthetic Gura Hospital directory. Not a real health system feed."""

from __future__ import annotations

from uuid import uuid4


class MockEhrAdapter:
    def __init__(self) -> None:
        self._patients: dict[str, dict] = {}

    def upsert_patient(self, payload: dict) -> str:
        ext = payload.get("ehr_external_id") or f"MOCK-{uuid4().hex[:8]}"
        self._patients[ext] = payload
        return ext

    def list_providers(self) -> list[dict]:
        return []

    def list_slots(self, provider_external_id: str) -> list[dict]:
        return []

    def book(self, payload: dict) -> str:
        return f"MOCK-APPT-{uuid4().hex[:8]}"


mock_ehr = MockEhrAdapter()
