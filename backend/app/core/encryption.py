"""Field-level AES-256-GCM encryption for PHI (Protected Health Information).

Satisfies HIPAA Security Rule requirements for encryption at rest (45 CFR § 164.312(a)(2)(iv)).
Uses AES-GCM with a 12-byte cryptographically secure random nonce per field.
Ciphertext format: base64(nonce [12 bytes] + ciphertext + tag [16 bytes]).
"""

from __future__ import annotations

import base64
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings

PHI_COLUMNS: dict[str, tuple[str, ...]] = {
    "patients": ("first_name", "last_name", "email", "phone", "date_of_birth", "mrn"),
    "conversation_messages": ("content",),
    "consent_records": ("notes",),
}

ENCRYPTION_PREFIX = "enc:gcm:"


def _derive_key(raw_key: str) -> bytes:
    """Normalizes key string to 32 bytes (256-bit AES key) whether raw string, hex, or base64."""
    # Check if base64 encoded
    try:
        decoded = base64.b64decode(raw_key)
        if len(decoded) == 32:
            return decoded
    except Exception:
        pass

    # Check if hex encoded
    try:
        decoded = bytes.fromhex(raw_key)
        if len(decoded) == 32:
            return decoded
    except Exception:
        pass

    # Raw utf-8 bytes padded or sliced to 32 bytes
    b = raw_key.encode("utf-8")
    if len(b) >= 32:
        return b[:32]
    # Pad to 32 bytes deterministically
    return b.ljust(32, b"\0")


def encrypt_if_configured(plaintext: str | None) -> str | None:
    """Encrypts plaintext with AES-256-GCM if an encryption_key is provided in settings."""
    if plaintext is None:
        return None
    key_setting = get_settings().encryption_key
    if not key_setting:
        return plaintext

    key = _derive_key(key_setting)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit unique nonce per encryption
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    encoded = base64.b64encode(nonce + ciphertext).decode("ascii")
    return f"{ENCRYPTION_PREFIX}{encoded}"


def decrypt_if_configured(value: str | None) -> str | None:
    """Decrypts ciphertext with AES-256-GCM, gracefully handling plaintext backwards compatibility."""
    if value is None:
        return None
    if not value.startswith(ENCRYPTION_PREFIX):
        # Plaintext backwards-compatibility (legacy or unencrypted rows)
        return value

    key_setting = get_settings().encryption_key
    if not key_setting:
        return value

    try:
        payload = value[len(ENCRYPTION_PREFIX):]
        raw = base64.b64decode(payload)
        if len(raw) < 28:  # 12 nonce + 16 auth tag minimum
            return value
        nonce = raw[:12]
        ciphertext = raw[12:]
        key = _derive_key(key_setting)
        aesgcm = AESGCM(key)
        decrypted = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted.decode("utf-8")
    except Exception:
        # If decryption fails (e.g. key mismatch), return safe placeholder rather than leaking corrupt data
        return "[ENCRYPTED_PHI_ACCESS_ERROR]"


def redact(value: Any) -> Any:
    """Redacts values for safe display in non-privileged audit logs."""
    if value is None:
        return None
    text = str(value)
    if text.startswith(ENCRYPTION_PREFIX):
        return "[ENCRYPTED_PHI]"
    if len(text) <= 4:
        return "***"
    return text[:2] + "…" + text[-1]
