from datetime import datetime

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    return {
        "status": "healthy",
        "service": "ai-agent-service",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/health/ready")
async def ready() -> dict[str, str]:
    return {"status": "ready"}


@router.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "alive"}
