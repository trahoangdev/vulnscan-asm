"""Shared pytest fixtures for scanner tests."""

import pytest


@pytest.fixture(autouse=True)
def _env_defaults(monkeypatch):
    """Set safe defaults so pydantic-settings doesn't read real .env."""
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost/test")
    monkeypatch.setenv("API_URL", "http://localhost:4000/v1")
    monkeypatch.setenv("SCANNER_API_KEY", "test-key")
