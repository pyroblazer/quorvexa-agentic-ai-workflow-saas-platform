"""Tests for app.main FastAPI application setup."""

from unittest.mock import patch

import pytest


def test_app_is_fastapi_instance():
    from fastapi import FastAPI

    from app.main import app

    assert isinstance(app, FastAPI)


def test_app_title():
    from app.main import app

    assert app.title == "Quorvexa AI Agent Service"


def test_app_version():
    from app.main import app

    assert app.version == "1.0.0"


def test_app_openapi_url():
    from app.main import app

    assert app.openapi_url == "/api/openapi.json"


def test_routes_include_health():
    from app.main import app

    paths = [route.path for route in app.routes]
    assert any("/api/v1/health" in p for p in paths)


def test_routes_include_agents():
    from app.main import app

    paths = [route.path for route in app.routes]
    assert any("/api/v1/agents" in p for p in paths)


def test_routes_include_tools():
    from app.main import app

    paths = [route.path for route in app.routes]
    assert any("/api/v1/tools" in p for p in paths)


@pytest.mark.asyncio
async def test_lifespan_runs():
    from app.main import app, lifespan

    with patch("app.main.init_tracing") as mock_tracing:
        async with lifespan(app):
            pass
        mock_tracing.assert_called_once_with("ai-agent-service")
