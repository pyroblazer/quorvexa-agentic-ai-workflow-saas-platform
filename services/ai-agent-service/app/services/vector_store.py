import uuid
from typing import Any

import structlog
from langchain_openai import OpenAIEmbeddings
from qdrant_client import AsyncQdrantClient
from qdrant_client.http.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.config import settings

logger = structlog.get_logger()

VECTOR_SIZE = 384  # all-MiniLM-L6-v2 produces 384-dimensional embeddings


class VectorStoreService:
    def __init__(self) -> None:
        self.client = AsyncQdrantClient(
            url=settings.vector_db_url,
            api_key=settings.vector_db_api_key or None,
        )
        self.embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            base_url=settings.openai_base_url,
            api_key=settings.openai_api_key or "ollama",
        )
        self.collection = settings.vector_db_collection

    async def ensure_collection(self) -> None:
        """Create collection if it doesn't exist — idempotent."""
        collections = await self.client.get_collections()
        names = [c.name for c in collections.collections]
        if self.collection not in names:
            await self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
            logger.info("Vector collection created", collection=self.collection)

    async def upsert(self, content: str, metadata: dict[str, Any]) -> str:
        await self.ensure_collection()

        point_id = str(uuid.uuid4())
        vector = await self.embeddings.aembed_query(content)

        await self.client.upsert(
            collection_name=self.collection,
            points=[
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={**metadata, "content": content},
                )
            ],
        )

        logger.debug("Embedded and stored", point_id=point_id)
        return point_id

    async def search(
        self,
        query: str,
        filters: dict[str, str] | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        await self.ensure_collection()

        query_vector = await self.embeddings.aembed_query(query)

        qdrant_filter = None
        if filters:
            conditions = [
                FieldCondition(key=k, match=MatchValue(value=v)) for k, v in filters.items()
            ]
            qdrant_filter = Filter(must=conditions)

        results = await self.client.search(
            collection_name=self.collection,
            query_vector=query_vector,
            query_filter=qdrant_filter,
            limit=limit,
            with_payload=True,
        )

        return [
            {
                "id": str(r.id),
                "score": r.score,
                "content": r.payload.get("content", ""),
                "metadata": {k: v for k, v in r.payload.items() if k != "content"},
            }
            for r in results
        ]
