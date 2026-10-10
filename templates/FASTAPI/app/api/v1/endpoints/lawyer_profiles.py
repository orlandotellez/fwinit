"""Lawyer profile endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.lawyer_profile import LawyerProfile
from app.models.user import User, UserRole
from app.schemas.lawyer_profile import (
    LawyerProfileCreate,
    LawyerProfileRead,
    LawyerProfileUpdate,
)
from app.services.lawyer_service import LawyerService

router = APIRouter()


@router.post(
    "/me",
    response_model=LawyerProfileRead,
    status_code=status.HTTP_201_CREATED,
)
def create_my_profile(
    payload: LawyerProfileCreate,
    current_user: User = Depends(require_roles(UserRole.LAWYER)),
    db: Session = Depends(get_db),
) -> LawyerProfile:
    """Create the lawyer profile for the authenticated lawyer."""
    return LawyerService(db).create_profile(current_user, payload)


@router.get("/me", response_model=LawyerProfileRead)
def read_my_profile(
    current_user: User = Depends(require_roles(UserRole.LAWYER)),
    db: Session = Depends(get_db),
) -> LawyerProfile:
    """Return the authenticated lawyer's profile."""
    profile = LawyerService(db).get_profile_by_user(current_user.id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lawyer profile not found",
        )
    return profile


@router.patch("/me", response_model=LawyerProfileRead)
def update_my_profile(
    payload: LawyerProfileUpdate,
    current_user: User = Depends(require_roles(UserRole.LAWYER)),
    db: Session = Depends(get_db),
) -> LawyerProfile:
    """Update the authenticated lawyer's profile."""
    service = LawyerService(db)
    profile = service.get_profile_by_user(current_user.id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lawyer profile not found",
        )
    return service.update_profile(profile, payload)


@router.get("/", response_model=list[LawyerProfileRead])
def list_lawyers(
    specialty: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[LawyerProfile]:
    """List lawyer profiles publicly, optionally filtered by specialty."""
    return LawyerService(db).list_lawyers(specialty=specialty, skip=skip, limit=limit)


@router.get("/{profile_id}", response_model=LawyerProfileRead)
def read_profile(
    profile_id: int,
    _: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> LawyerProfile:
    """Return any lawyer profile by id (authenticated users only)."""
    return LawyerService(db).get_profile_or_404(profile_id)
