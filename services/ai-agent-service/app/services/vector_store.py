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
        self.embeddings = OpenAIEmbeddings(
            model=settings.embedding_model,
            base_url=settings.openai_base_url,
            api_key=settings.openai_api_key or "ollama",
        )
        self.collection = settings.vector_db_collection
        self._provider = settings.vector_db_provider

        if self._provider == "supabase":
            from supabase import create_client

            self._supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
        else:
            self.client = AsyncQdrantClient(
                url=settings.vector_db_url,
                api_key=settings.vector_db_api_key or None,
            )

    # --- Qdrant backend ---

    async def _qdrant_ensure_collection(self) -> None:
        collections = await self.client.get_collections()
        names = [c.name for c in collections.collections]
        if self.collection not in names:
            await self.client.create_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
            )
            logger.info("Vector collection created", collection=self.collection)

    async def _qdrant_upsert(self, content: str, metadata: dict[str, Any]) -> str:
        await self._qdrant_ensure_collection()

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
        return point_id

    async def _qdrant_search(
        self,
        query: str,
        filters: dict[str, str] | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        await self._qdrant_ensure_collection()
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

    # --- Supabase pgvector backend ---

    async def _supabase_ensure_collection(self) -> None:
        # Table and match_documents RPC are created by Supabase migrations
        # (infra/supabase/migrations/). No runtime DDL needed.
        logger.debug("Vector table managed by migrations", table=self.collection)

    async def _supabase_upsert(self, content: str, metadata: dict[str, Any]) -> str:
        point_id = str(uuid.uuid4())
        vector = await self.embeddings.aembed_query(content)
        vector_str = "[" + ",".join(str(v) for v in vector) + "]"

        self._supabase.table(self.collection).insert({
            "id": point_id,
            "content": content,
            "metadata": metadata,
            "embedding": vector_str,
        }).execute()

        return point_id

    async def _supabase_search(
        self,
        query: str,
        filters: dict[str, str] | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        query_vector = await self.embeddings.aembed_query(query)
        vector_str = "[" + ",".join(str(v) for v in query_vector) + "]"

        filter_json = {}
        if filters:
            filter_json = filters

        response = self._supabase.rpc("match_documents", {
            "query_embedding": vector_str,
            "match_table": self.collection,
            "match_filter": filter_json,
            "match_limit": limit,
        }).execute()

        results = []
        for row in response.data:
            results.append({
                "id": str(row.get("id", "")),
                "score": row.get("similarity", 0.0),
                "content": row.get("content", ""),
                "metadata": row.get("metadata", {}),
            })
        return results

    # --- Unified interface ---

    async def ensure_collection(self) -> None:
        if self._provider == "supabase":
            await self._supabase_ensure_collection()
        else:
            await self._qdrant_ensure_collection()

    async def upsert(self, content: str, metadata: dict[str, Any]) -> str:
        if self._provider == "supabase":
            point_id = await self._supabase_upsert(content, metadata)
        else:
            point_id = await self._qdrant_upsert(content, metadata)
        logger.debug("Embedded and stored", point_id=point_id, provider=self._provider)
        return point_id

    async def search(
        self,
        query: str,
        filters: dict[str, str] | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        if self._provider == "supabase":
            return await self._supabase_search(query, filters, limit)
        return await self._qdrant_search(query, filters, limit)
