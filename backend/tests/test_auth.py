from __future__ import annotations

import jwt

from src.config.settings import JWT_ALGORITHM, JWT_SECRET
from src.modules.auth.routes import create_access_token, hash_password, verify_password


def test_create_access_token_contains_uid() -> None:
    token = create_access_token('user-123')
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    assert payload['uid'] == 'user-123'
    assert 'exp' in payload


def test_password_hash_and_verify_roundtrip() -> None:
    hashed = hash_password('secret123')
    assert hashed != 'secret123'
    assert verify_password('secret123', hashed) is True
    assert verify_password('wrong-password', hashed) is False
