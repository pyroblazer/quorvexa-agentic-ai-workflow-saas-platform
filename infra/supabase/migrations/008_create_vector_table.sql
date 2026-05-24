-- ============================================================
-- Migration 008: Vector embeddings table (pgvector)
--
-- Used by ai-agent-service when VECTOR_DB_PROVIDER=supabase.
-- Must run AFTER 001_enable_pgvector.sql.
-- ============================================================

CREATE TABLE public.quorvexa_embeddings (
    id        uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    content   text          NOT NULL,
    metadata  jsonb         NOT NULL DEFAULT '{}',
    embedding vector(384)   -- all-MiniLM-L6-v2 produces 384-dimensional embeddings
);

-- HNSW index for fast approximate nearest-neighbor search.
-- Creates concurrently to avoid locking the empty table.
CREATE INDEX idx_quorvexa_embeddings_embedding
    ON public.quorvexa_embeddings
    USING hnsw (embedding vector_cosine_ops);
