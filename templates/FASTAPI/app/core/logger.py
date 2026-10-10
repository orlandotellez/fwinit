"""Logging configuration helpers."""

import logging

from app.core.config import settings

_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def configure_logging() -> None:
    """Configure the root logger with a stream handler and a standard format."""
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logging.basicConfig(
        level=level,
        format=_LOG_FORMAT,
        datefmt=_DATE_FORMAT,
        handlers=[logging.StreamHandler()],
        force=True,
    )


def get_logger(name: str) -> logging.Logger:
    """Return a named logger using the application-wide configuration."""
    return logging.getLogger(name)
