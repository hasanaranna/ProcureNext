# ============================================================
# messaging/encryption.py - AES-256-GCM Message Encryption
# ============================================================
# Encrypts message plaintext before database INSERT and decrypts
# on SELECT. Uses a single server-managed key from env var.
#
# Each message gets a unique 12-byte random IV (nonce) stored
# alongside the ciphertext in the messages table.
# ============================================================

import os
import base64

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

_KEY: bytes | None = None


def _get_key() -> bytes:
    """Load the 256-bit encryption key from environment (hex-encoded)."""
    global _KEY
    if _KEY is None:
        raw = os.environ.get("MESSAGE_ENCRYPTION_KEY")
        if not raw:
            raise RuntimeError(
                "MESSAGE_ENCRYPTION_KEY environment variable is not set. "
                'Generate one with: python -c "import os; print(os.urandom(32).hex())"'
            )
        _KEY = bytes.fromhex(raw)
        if len(_KEY) != 32:
            raise RuntimeError("MESSAGE_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).")
    return _KEY


def encrypt_message(plaintext: str) -> tuple[str, str]:
    """
    Encrypt a plaintext message using AES-256-GCM.

    Returns:
        (ciphertext_b64, iv_b64) — both base64-encoded strings
        ready for database storage.
    """
    key = _get_key()
    iv = os.urandom(12)  # 96-bit nonce for GCM
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(iv, plaintext.encode("utf-8"), None)
    return (
        base64.b64encode(ciphertext).decode("ascii"),
        base64.b64encode(iv).decode("ascii"),
    )


def decrypt_message(ciphertext_b64: str, iv_b64: str) -> str:
    """
    Decrypt an AES-256-GCM encrypted message.

    Args:
        ciphertext_b64: Base64-encoded ciphertext from DB.
        iv_b64: Base64-encoded initialization vector from DB.

    Returns:
        Decrypted plaintext string.
    """
    key = _get_key()
    aesgcm = AESGCM(key)
    ciphertext = base64.b64decode(ciphertext_b64)
    iv = base64.b64decode(iv_b64)
    return aesgcm.decrypt(iv, ciphertext, None).decode("utf-8")
