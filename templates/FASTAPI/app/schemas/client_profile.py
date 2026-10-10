"""Pydantic schemas for client profiles."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ClientProfileBase(BaseModel):
    """Fields shared by client profile payloads."""

    phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=255)
    company: str | None = Field(default=None, max_length=255)


class ClientProfileCreate(ClientProfileBase):
    """Payload for creating a client profile."""


class ClientProfileUpdate(BaseModel):
    """Payload for partially updating a client profile."""

    phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=255)
    company: str | None = Field(default=None, max_length=255)


class ClientProfileRead(ClientProfileBase):
    """Client profile representation returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
