"""Pydantic schemas for user resources."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import UserRole


class UserBase(BaseModel):
    """Fields shared by user payloads."""

    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    """Payload for registering a new user."""

    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = UserRole.CLIENT


class UserUpdate(BaseModel):
    """Payload for partially updating a user."""

    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserRead(UserBase):
    """User representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime


class UserLogin(BaseModel):
    """JSON login payload (alternative to the OAuth2 password form)."""

    email: EmailStr
    password: str
