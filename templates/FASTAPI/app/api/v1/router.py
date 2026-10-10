"""Aggregate router for API version 1."""

from fastapi import APIRouter

from app.api.v1.endpoints import auth, client_profiles, lawyer_profiles, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(
    client_profiles.router,
    prefix="/client-profiles",
    tags=["client-profiles"],
)
api_router.include_router(
    lawyer_profiles.router,
    prefix="/lawyer-profiles",
    tags=["lawyer-profiles"],
)
