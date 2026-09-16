"""EHR adapter port. Agents never import a vendor SDK — only this interface.

TODO(production): implement Epic FHIR R4 / Cerner adapters behind the same port.
Do not change agent tools when swapping vendors.
"""

from __future__ import annotations

from typing import Protocol


class EhrAdapter(Protocol):
    def upsert_patient(self, payload: dict) -> str: ...
    def list_providers(self) -> list[dict]: ...
    def list_slots(self, provider_external_id: str) -> list[dict]: ...
    def book(self, payload: dict) -> str: ...
