-- ============================================================
-- Migration 002: Create match_documents RPC function
--
-- Called by vector_store.py's _supabase_search() method.
-- Performs cosine-similarity search on a pgvector table with
-- optional JSONB metadata filters.
--
-- IMPORTANT: Run AFTER 001_enable_pgvector.sql, because the
-- function signature references the `vector` type.
-- ============================================================

CREATE OR REPLACE FUNCTION public.match_documents(
    query_embedding  vector,
    match_table      text,
    match_filter     jsonb    DEFAULT '{}',
    match_limit      int      DEFAULT 5
)
RETURNS TABLE (
    id         uuid,
    content    text,
    metadata   jsonb,
    similarity float
)
LANGUAGE plpgsql STABLE
AS $function$
DECLARE
    _filter_clause text := '';
    _key           text;
    _value         text;
BEGIN
    -- Build WHERE clause from match_filter JSONB
    IF match_filter <> '{}'::jsonb THEN
        FOR _key, _value IN SELECT key, value::text FROM jsonb_each_text(match_filter)
        LOOP
            _filter_clause := _filter_clause
                || format(' AND metadata ->> %L = %L ', _key, _value);
        END LOOP;
    END IF;

    RETURN QUERY EXECUTE format(
        'SELECT id, content, metadata, 1 - (embedding <=> $1) AS similarity
         FROM %I
         WHERE true %s
         ORDER BY embedding <=> $1
         LIMIT $2',
        match_table,
        _filter_clause
    )
    USING query_embedding, match_limit;
END;
$function$;
