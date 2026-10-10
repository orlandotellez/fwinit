"""Business logic and queries for lawyer profiles."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lawyer_profile import LawyerProfile
from app.models.user import User, UserRole
from app.schemas.lawyer_profile import LawyerProfileCreate, LawyerProfileUpdate


class LawyerService:
    """Encapsulates every lawyer profile query and mutation."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_profile_by_user(self, user_id: int) -> LawyerProfile | None:
        """Return the lawyer profile owned by a user, or None."""
        return self.db.scalar(
            select(LawyerProfile).where(LawyerProfile.user_id == user_id)
        )

    def get_profile_by_id(self, profile_id: int) -> LawyerProfile | None:
        """Return the lawyer profile with the given id, or None."""
        return self.db.get(LawyerProfile, profile_id)

    def get_profile_or_404(self, profile_id: int) -> LawyerProfile:
        """Return the lawyer profile or raise HTTP 404."""
        profile = self.get_profile_by_id(profile_id)
        if profile is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lawyer profile not found",
            )
        return profile

    def list_lawyers(
        self,
        *,
        specialty: str | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[LawyerProfile]:
        """Return a paginated list of lawyer profiles, optionally filtered."""
        stmt = select(LawyerProfile)
        if specialty is not None:
            stmt = stmt.where(LawyerProfile.specialty == specialty)
        stmt = stmt.order_by(LawyerProfile.id).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def create_profile(self, user: User, data: LawyerProfileCreate) -> LawyerProfile:
        """Create a lawyer profile for a lawyer user without an existing one."""
        if user.role != UserRole.LAWYER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a lawyer",
            )
        if self.get_profile_by_user(user.id) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Lawyer profile already exists",
            )
        profile = LawyerProfile(user_id=user.id, **data.model_dump())
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def update_profile(
        self, profile: LawyerProfile, data: LawyerProfileUpdate
    ) -> LawyerProfile:
        """Apply the provided fields to a lawyer profile."""
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile
