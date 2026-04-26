from fastapi import APIRouter

from app.services.tools import get_available_tools

router = APIRouter()


@router.get("")
async def list_tools() -> list[dict[str, str]]:
    """List all available agent tools."""
    tools = get_available_tools()
    return [{"name": t.name, "description": t.description} for t in tools]
