"""Database engine, session factory, and declarative base."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Declarative base class shared by every ORM model."""


def get_db() -> Generator[Session, None, None]:
    """Yield a database session and always close it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create every table from the registered metadata.

    In real deployments Alembic owns schema migrations; this helper exists only
    for local bootstrapping and tests. The model modules are imported here (and
    not at module import time) to avoid a circular import: the models import
    ``Base`` from this module, so importing them while this module is still
    executing would fail.
    """
    from app.models import client_profile, lawyer_profile, user  # noqa: F401

    Base.metadata.create_all(bind=engine)
