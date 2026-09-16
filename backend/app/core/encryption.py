"""
Field-level encryption plan for PHI.

TODO(HIPAA / security review):
- Store APP_ENCRYPTION_KEY in a KMS/HSM (AWS KMS, GCP KMS, Azure Key Vault).
- Use AES-256-GCM with a unique nonce per field; persist nonce+ciphertext+tag.
- Envelope-encrypt DEKs per tenant so a hospital can rotate keys independently.
- Never log decrypted PHI. Redact in audit payloads.
- This MVP stores plaintext in PostgreSQL so the hackathon stack runs locally.
"""

from __future__ import annotations

from typing import Any

from app.core.config import get_settings


PHI_COLUMNS: dict[str, tuple[str, ...]] = {
    "patients": ("first_name", "last_name", "email", "phone", "date_of_birth", "mrn"),
    "conversation_messages": ("content",),
    "consent_records": ("notes",),
}


def encrypt_if_configured(plaintext: str | None) -> str | None:
    if plaintext is None:
        return None
    key = get_settings().encryption_key
    if not key:
        return plaintext
    # TODO(HIPAA): replace with AES-GCM. Identity transform until a key is provisioned.
    return plaintext


def decrypt_if_configured(value: str | None) -> str | None:
    return value


def redact(value: Any) -> Any:
    if value is None:
        return None
    text = str(value)
    if len(text) <= 4:
        return "***"
    return text[:2] + "…" + text[-1]
