"""Password hashing and JWT token helpers."""

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True when a plaintext password matches the stored hash."""
    return pwd_context.verify(plain_password, hashed_password)


def _create_token(subject: str | int, token_type: str, expires_delta: timedelta) -> str:
    """Build and sign a JWT with the shared claims."""
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(subject: str | int, expires_delta: timedelta | None = None) -> str:
    """Create a signed access token for the given subject."""
    delta = expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(subject, ACCESS_TOKEN_TYPE, delta)


def create_refresh_token(subject: str | int) -> str:
    """Create a signed refresh token for the given subject."""
    delta = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return _create_token(subject, REFRESH_TOKEN_TYPE, delta)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT, returning its claims.

    Raises:
        jwt.PyJWTError: If the token is malformed, expired, or signed with the
            wrong key/algorithm.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
