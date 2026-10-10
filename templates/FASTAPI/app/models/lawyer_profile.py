"""Lawyer profile model."""

from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


class LawyerProfile(Base, TimestampMixin):
    """Professional data attached to a user with the `lawyer` role (1:1 with User)."""

    __tablename__ = "lawyer_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    license_number: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    specialty: Mapped[str | None] = mapped_column(String(120), nullable=True, index=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    years_experience: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    hourly_rate: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="lawyer_profile")
