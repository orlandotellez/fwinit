"""Client profile endpoints.

Client profiles are simple 1:1 extensions of a user, so the small amount of
database access is kept local to this module rather than a dedicated service.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.client_profile import ClientProfile
from app.models.user import User, UserRole
from app.schemas.client_profile import (
    ClientProfileCreate,
    ClientProfileRead,
    ClientProfileUpdate,
)

router = APIRouter()


def _get_profile_by_user(db: Session, user_id: int) -> ClientProfile | None:
    """Return the client profile owned by a user, or None."""
    return db.scalar(select(ClientProfile).where(ClientProfile.user_id == user_id))


def _not_found() -> HTTPException:
    """Build the standard 404 for a missing client profile."""
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Client profile not found",
    )


@router.post(
    "/me",
    response_model=ClientProfileRead,
    status_code=status.HTTP_201_CREATED,
)
def create_my_profile(
    payload: ClientProfileCreate,
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
    db: Session = Depends(get_db),
) -> ClientProfile:
    """Create the client profile for the authenticated client."""
    if _get_profile_by_user(db, current_user.id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Client profile already exists",
        )
    profile = ClientProfile(user_id=current_user.id, **payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/me", response_model=ClientProfileRead)
def read_my_profile(
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
    db: Session = Depends(get_db),
) -> ClientProfile:
    """Return the authenticated client's profile."""
    profile = _get_profile_by_user(db, current_user.id)
    if profile is None:
        raise _not_found()
    return profile


@router.patch("/me", response_model=ClientProfileRead)
def update_my_profile(
    payload: ClientProfileUpdate,
    current_user: User = Depends(require_roles(UserRole.CLIENT)),
    db: Session = Depends(get_db),
) -> ClientProfile:
    """Update the authenticated client's profile."""
    profile = _get_profile_by_user(db, current_user.id)
    if profile is None:
        raise _not_found()
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{profile_id}", response_model=ClientProfileRead)
def read_profile(
    profile_id: int,
    _: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> ClientProfile:
    """Return any client profile by id (authenticated users only)."""
    profile = db.get(ClientProfile, profile_id)
    if profile is None:
        raise _not_found()
    return profile
