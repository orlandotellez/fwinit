"""Pydantic schemas for lawyer profiles."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class LawyerProfileBase(BaseModel):
    """Fields shared by lawyer profile payloads."""

    license_number: str = Field(..., min_length=1, max_length=64)
    specialty: str | None = Field(default=None, max_length=120)
    bio: str | None = None
    years_experience: int = Field(default=0, ge=0)
    hourly_rate: Decimal | None = Field(default=None, ge=0)


class LawyerProfileCreate(LawyerProfileBase):
    """Payload for creating a lawyer profile."""


class LawyerProfileUpdate(BaseModel):
    """Payload for partially updating a lawyer profile."""

    license_number: str | None = Field(default=None, min_length=1, max_length=64)
    specialty: str | None = Field(default=None, max_length=120)
    bio: str | None = None
    years_experience: int | None = Field(default=None, ge=0)
    hourly_rate: Decimal | None = Field(default=None, ge=0)


class LawyerProfileRead(LawyerProfileBase):
    """Lawyer profile representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
