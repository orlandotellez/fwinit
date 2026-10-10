"""Business logic and queries for user accounts."""

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    """Encapsulates every user query and mutation."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        """Return the user with the given email, or None."""
        return self.db.scalar(select(User).where(User.email == email))

    def get_by_id(self, user_id: int) -> User | None:
        """Return the user with the given id, or None."""
        return self.db.get(User, user_id)

    def get_or_404(self, user_id: int) -> User:
        """Return the user or raise HTTP 404."""
        user = self.get_by_id(user_id)
        if user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        return user

    def list_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        """Return a paginated list of users."""
        stmt = select(User).order_by(User.id).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def create_user(self, data: UserCreate) -> User:
        """Create a user, hashing the password and rejecting duplicate emails."""
        if self.get_by_email(data.email) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        user = User(
            email=data.email,
            full_name=data.full_name,
            hashed_password=hash_password(data.password),
            role=data.role,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def authenticate(self, email: str, password: str) -> User:
        """Return the user when credentials are valid, otherwise raise 401/403."""
        user = self.get_by_email(email)
        if user is None or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Inactive user",
            )
        return user

    def update_user(self, user: User, data: UserUpdate) -> User:
        """Update the mutable fields of a user."""
        updates = data.model_dump(exclude_unset=True)
        if updates.get("full_name") is not None:
            user.full_name = updates["full_name"]
        if updates.get("password") is not None:
            user.hashed_password = hash_password(updates["password"])
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def deactivate_user(self, user_id: int) -> User:
        """Mark a user as inactive or raise HTTP 404 if it does not exist."""
        user = self.get_or_404(user_id)
        user.is_active = False
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
