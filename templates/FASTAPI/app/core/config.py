"""Application configuration powered by pydantic-settings."""

from functools import lru_cache
from typing import Annotated, Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables and an optional `.env`.

    Defaults keep the module importable without configuration; production
    deployments must override every value that carries a placeholder.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "Legal Services Marketplace API"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/app"

    # Override in production. Placeholder only, never a real credential.
    # Kept >= 32 bytes so PyJWT does not warn about short HMAC keys.
    SECRET_KEY: str = "change-me-in-production-with-32-bytes-or-more"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # `NoDecode` disables pydantic-settings' JSON parsing for this field so the
    # validator below can accept a plain comma-separated string (or JSON list).
    BACKEND_CORS_ORIGINS: Annotated[list[str], NoDecode] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> Any:
        """Accept a comma-separated string, a JSON list, or an existing list."""
        if value is None or value == "":
            return []
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                return stripped
            return [item.strip() for item in stripped.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Return a cached `Settings` instance."""
    return Settings()


settings = get_settings()
