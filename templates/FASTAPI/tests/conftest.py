"""Pytest fixtures for the FastAPI template test-suite.

The application is configured for PostgreSQL, but the test-suite runs against
an in-memory SQLite database for speed and isolation.
"""

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.models.user import User, UserRole

# Import every model module so its table registers on Base.metadata.
from app.models import client_profile, lawyer_profile  # noqa: F401
from main import app

TEST_DATABASE_URL = "sqlite://"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture(scope="session", autouse=True)
def _create_schema() -> Generator[None, None, None]:
    """Create the schema once per test session and drop it afterwards."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    """Provide a database session backed by the in-memory SQLite engine."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    """Provide a TestClient with the database dependency overridden."""

    def _override_get_db() -> Generator[Session, None, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def sample_user(db_session: Session) -> User:
    """Create and persist an active client user."""
    user = User(
        email="client@example.com",
        full_name="Sample Client",
        hashed_password=hash_password("password123"),
        role=UserRole.CLIENT,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def auth_headers(sample_user: User) -> dict[str, str]:
    """Return bearer authorization headers for the sample user."""
    token = create_access_token(sample_user.id)
    return {"Authorization": f"Bearer {token}"}
