"""Comprehensive tests for the AI agent service endpoints."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


# ─── Health Endpoints ────────────────────────────────────────────────


def test_health_check(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "ai-agent-service"


def test_ready_probe(client: TestClient) -> None:
    response = client.get("/api/v1/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"


def test_live_probe(client: TestClient) -> None:
    response = client.get("/api/v1/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "alive"


# ─── Tools Endpoints ─────────────────────────────────────────────────


def test_list_tools(client: TestClient) -> None:
    response = client.get("/api/v1/tools")
    assert response.status_code == 200
    tools = response.json()
    assert isinstance(tools, list)
    assert len(tools) > 0
    assert all("name" in t and "description" in t for t in tools)


def test_tools_include_expected_names(client: TestClient) -> None:
    response = client.get("/api/v1/tools")
    tools = response.json()
    tool_names = [t["name"] for t in tools]
    assert "search_web" in tool_names
    assert "execute_code" in tool_names
    assert "query_database" in tool_names
    assert "send_http_request" in tool_names
    assert "summarize_text" in tool_names


# ─── Agent Run Endpoint ──────────────────────────────────────────────


@patch("app.routers.agents.AgentService")
def test_run_agent_success(mock_service_class: MagicMock, client: TestClient) -> None:
    mock_service = AsyncMock()
    mock_service.run.return_value = {
        "output": "I can help you automate that workflow.",
        "session_id": "test-session",
        "model": "llama3",
        "duration_seconds": 0.5,
        "intermediate_steps": [],
    }
    mock_service_class.return_value = mock_service

    response = client.post(
        "/api/v1/agents/run",
        json={"prompt": "Help me create a workflow", "session_id": "test-session"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "output" in data
    assert data["session_id"] == "test-session"
    assert "model" in data
    assert "duration_seconds" in data


def test_run_agent_empty_prompt(client: TestClient) -> None:
    response = client.post("/api/v1/agents/run", json={"prompt": ""})
    assert response.status_code == 422


def test_run_agent_missing_prompt(client: TestClient) -> None:
    response = client.post("/api/v1/agents/run", json={})
    assert response.status_code == 422


def test_run_agent_prompt_too_long(client: TestClient) -> None:
    response = client.post(
        "/api/v1/agents/run",
        json={"prompt": "x" * 10001},
    )
    assert response.status_code == 422


@patch("app.routers.agents.AgentService")
def test_run_agent_with_config(mock_service_class: MagicMock, client: TestClient) -> None:
    mock_service = AsyncMock()
    mock_service.run.return_value = {
        "output": "Configured agent response",
        "session_id": "cfg-session",
        "model": "gpt-4",
        "duration_seconds": 1.2,
        "intermediate_steps": [],
    }
    mock_service_class.return_value = mock_service

    response = client.post(
        "/api/v1/agents/run",
        json={
            "prompt": "Run with custom config",
            "session_id": "cfg-session",
            "config": {"system_prompt": "You are a data analyst", "max_iterations": 5},
            "context": {"user_id": "u1", "tenant_id": "t1"},
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["output"] == "Configured agent response"


@patch("app.routers.agents.AgentService")
def test_run_agent_execution_failure(mock_service_class: MagicMock, client: TestClient) -> None:
    mock_service = AsyncMock()
    mock_service.run.side_effect = RuntimeError("LLM service unavailable")
    mock_service_class.return_value = mock_service

    response = client.post(
        "/api/v1/agents/run",
        json={"prompt": "This will fail"},
    )

    assert response.status_code == 500
    assert "Agent execution failed" in response.json()["detail"]


# ─── Embed Endpoint ──────────────────────────────────────────────────


@patch("app.routers.agents.AgentService")
def test_embed_content_success(mock_service_class: MagicMock, client: TestClient) -> None:
    mock_service = AsyncMock()
    mock_service.embed_and_store.return_value = "point-abc123"
    mock_service_class.return_value = mock_service

    response = client.post(
        "/api/v1/agents/embed",
        json={"content": "Some text to embed", "metadata": {"source": "test"}},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["point_id"] == "point-abc123"


def test_embed_content_empty(client: TestClient) -> None:
    response = client.post("/api/v1/agents/embed", json={"content": ""})
    assert response.status_code == 422


# ─── Search Endpoint ─────────────────────────────────────────────────


@patch("app.routers.agents.AgentService")
def test_search_memory_success(mock_service_class: MagicMock, client: TestClient) -> None:
    mock_service = AsyncMock()
    mock_service.search_memory.return_value = [
        {"content": "Result 1", "score": 0.95},
        {"content": "Result 2", "score": 0.87},
    ]
    mock_service_class.return_value = mock_service

    response = client.post(
        "/api/v1/agents/search",
        json={"query": "test query", "tenant_id": "tenant-1", "limit": 5},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["score"] == 0.95


def test_search_memory_empty_query(client: TestClient) -> None:
    response = client.post(
        "/api/v1/agents/search",
        json={"query": "", "tenant_id": "t1"},
    )
    assert response.status_code == 422


def test_search_memory_limit_bounds(client: TestClient) -> None:
    response = client.post(
        "/api/v1/agents/search",
        json={"query": "test", "tenant_id": "t1", "limit": 100},
    )
    assert response.status_code == 422  # max is 50


# ─── AgentService Unit Tests ─────────────────────────────────────────


@patch("app.services.agent_service.VectorStoreService")
@patch("app.services.agent_service.ChatOpenAI")
def test_agent_service_init(mock_llm_cls: MagicMock, mock_vs_cls: MagicMock) -> None:
    from app.services.agent_service import AgentService

    service = AgentService()
    assert service.vector_store is not None
    mock_llm_cls.assert_called_once()


# ─── Middleware Tests ─────────────────────────────────────────────────


def test_request_has_request_id_header(client: TestClient) -> None:
    response = client.get("/api/v1/health")
    assert "x-request-id" in response.headers


def test_cors_headers_present(client: TestClient) -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert "access-control-allow-origin" in response.headers


# ─── Metrics Endpoint ────────────────────────────────────────────────


def test_metrics_endpoint(client: TestClient) -> None:
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "http_requests_total" in response.text or "HELP" in response.text
