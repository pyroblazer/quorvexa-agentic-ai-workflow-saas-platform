import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.services.agent_service import AgentService

logger = structlog.get_logger()
router = APIRouter()


class AgentRunRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=10000)
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    config: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)


class EmbedRequest(BaseModel):
    content: str = Field(..., min_length=1)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    tenant_id: str
    limit: int = Field(default=5, ge=1, le=50)


def get_agent_service() -> AgentService:
    return AgentService()


@router.post("/run")
async def run_agent(
    request: AgentRunRequest,
    service: AgentService = Depends(get_agent_service),
) -> dict[str, Any]:
    """Execute an AI agent with the given prompt and configuration."""
    try:
        return await service.run(
            prompt=request.prompt,
            session_id=request.session_id,
            config=request.config,
            context=request.context,
        )
    except Exception as e:
        logger.error("Agent execution failed", error=str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent execution failed: {e!s}",
        ) from e


@router.post("/embed")
async def embed_content(
    request: EmbedRequest,
    service: AgentService = Depends(get_agent_service),
) -> dict[str, str]:
    """Store content in vector DB for agent memory retrieval."""
    point_id = await service.embed_and_store(request.content, request.metadata)
    return {"point_id": point_id}


@router.post("/search")
async def search_memory(
    request: SearchRequest,
    service: AgentService = Depends(get_agent_service),
) -> list[dict[str, Any]]:
    """Search agent memory using semantic similarity."""
    return await service.search_memory(request.query, request.tenant_id, request.limit)
