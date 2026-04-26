from langchain.tools import tool
from langchain_core.tools import BaseTool


@tool
def search_web(query: str) -> str:
    """Search the web for information. Use this when you need current information."""
    # In production, integrate with DuckDuckGo or SerpAPI
    return f"Search results for: {query} (web search integration required)"


@tool
def execute_code(code: str, language: str = "python") -> str:
    """Execute code in a sandboxed environment. Supports python and javascript."""
    # In production, integrate with a secure code execution sandbox
    return f"Code execution result: (sandbox required for language={language})"


@tool
def query_database(query: str, connection_id: str) -> str:
    """Query a connected database using natural language."""
    return f"Database query results for: {query} on connection: {connection_id}"


@tool
def send_http_request(url: str, method: str = "GET", body: str = "") -> str:
    """Make an HTTP request to an external service."""
    import urllib.request

    try:
        req = urllib.request.Request(url, method=method.upper())
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.read().decode()
    except Exception as e:
        return f"HTTP request failed: {e!s}"


@tool
def summarize_text(text: str, max_words: int = 150) -> str:
    """Summarize a long piece of text to the specified word count."""
    words = text.split()
    if len(words) <= max_words:
        return text
    return " ".join(words[:max_words]) + "..."


def get_available_tools() -> list[BaseTool]:
    return [search_web, execute_code, query_database, send_http_request, summarize_text]
