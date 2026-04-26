"""Unit tests for the AI agent tools."""

from unittest.mock import MagicMock, patch

from app.services.tools import (
    execute_code,
    get_available_tools,
    query_database,
    search_web,
    send_http_request,
    summarize_text,
)

# ─── search_web ────────────────────────────────────────────────────────────────


def test_search_web_returns_string() -> None:
    result = search_web.invoke({"query": "Python testing"})
    assert isinstance(result, str)


def test_search_web_includes_query_in_result() -> None:
    result = search_web.invoke({"query": "langchain agents"})
    assert "langchain agents" in result


def test_search_web_non_empty_result() -> None:
    result = search_web.invoke({"query": "NestJS"})
    assert len(result) > 0


# ─── execute_code ──────────────────────────────────────────────────────────────


def test_execute_code_returns_string() -> None:
    result = execute_code.invoke({"code": "print('hello')", "language": "python"})
    assert isinstance(result, str)


def test_execute_code_defaults_to_python() -> None:
    result = execute_code.invoke({"code": "x = 1"})
    assert "python" in result.lower()


def test_execute_code_reports_language() -> None:
    result = execute_code.invoke({"code": "console.log('hi')", "language": "javascript"})
    assert "javascript" in result


# ─── query_database ────────────────────────────────────────────────────────────


def test_query_database_returns_string() -> None:
    result = query_database.invoke({"query": "show all users", "connection_id": "conn-1"})
    assert isinstance(result, str)


def test_query_database_includes_query() -> None:
    result = query_database.invoke({"query": "count workflows", "connection_id": "db1"})
    assert "count workflows" in result


def test_query_database_includes_connection_id() -> None:
    result = query_database.invoke({"query": "select 1", "connection_id": "my-conn"})
    assert "my-conn" in result


# ─── send_http_request ─────────────────────────────────────────────────────────


def test_send_http_request_handles_connection_error() -> None:
    result = send_http_request.invoke(
        {
            "url": "http://nonexistent-host-12345.invalid",
            "method": "GET",
        }
    )
    assert "HTTP request failed" in result or "failed" in result.lower()


def test_send_http_request_handles_invalid_url() -> None:
    result = send_http_request.invoke({"url": "not-a-url", "method": "GET"})
    assert isinstance(result, str)


@patch("urllib.request.urlopen")
def test_send_http_request_success(mock_urlopen: MagicMock) -> None:
    mock_response = MagicMock()
    mock_response.__enter__ = lambda s: s
    mock_response.__exit__ = MagicMock(return_value=False)
    mock_response.read.return_value = b'{"status": "ok"}'
    mock_urlopen.return_value = mock_response

    result = send_http_request.invoke({"url": "http://example.com/api", "method": "GET"})
    assert '{"status": "ok"}' in result


@patch("urllib.request.urlopen")
def test_send_http_request_post(mock_urlopen: MagicMock) -> None:
    mock_response = MagicMock()
    mock_response.__enter__ = lambda s: s
    mock_response.__exit__ = MagicMock(return_value=False)
    mock_response.read.return_value = b"created"
    mock_urlopen.return_value = mock_response

    result = send_http_request.invoke(
        {
            "url": "http://example.com/api",
            "method": "POST",
            "body": '{"key": "val"}',
        }
    )
    assert "created" in result


# ─── summarize_text ────────────────────────────────────────────────────────────


def test_summarize_text_returns_text_unchanged_if_short() -> None:
    short_text = "This is a short sentence."
    result = summarize_text.invoke({"text": short_text, "max_words": 150})
    assert result == short_text


def test_summarize_text_truncates_long_text() -> None:
    long_text = " ".join(["word"] * 300)
    result = summarize_text.invoke({"text": long_text, "max_words": 50})
    words = result.replace("...", "").split()
    assert len(words) <= 50
    assert result.endswith("...")


def test_summarize_text_default_max_words() -> None:
    long_text = " ".join([f"word{i}" for i in range(200)])
    result = summarize_text.invoke({"text": long_text})
    assert result.endswith("...")


def test_summarize_text_exact_boundary() -> None:
    text = " ".join(["w"] * 150)
    result = summarize_text.invoke({"text": text, "max_words": 150})
    assert not result.endswith("...")
    assert result == text


def test_summarize_text_empty_string() -> None:
    result = summarize_text.invoke({"text": "", "max_words": 50})
    assert result == ""


# ─── get_available_tools ───────────────────────────────────────────────────────


def test_get_available_tools_returns_list() -> None:
    tools = get_available_tools()
    assert isinstance(tools, list)


def test_get_available_tools_has_five_tools() -> None:
    tools = get_available_tools()
    assert len(tools) == 5


def test_get_available_tools_names() -> None:
    tools = get_available_tools()
    names = [t.name for t in tools]
    assert "search_web" in names
    assert "execute_code" in names
    assert "query_database" in names
    assert "send_http_request" in names
    assert "summarize_text" in names


def test_each_tool_has_description() -> None:
    tools = get_available_tools()
    for tool in tools:
        assert tool.description and len(tool.description) > 0
