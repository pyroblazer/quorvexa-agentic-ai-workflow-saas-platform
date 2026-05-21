-- ============================================================
-- Migration 001: Enable pgvector extension
-- Run this FIRST in the Supabase SQL Editor.
-- Requires: Supabase project with vector extension available
--   (enabled by default on all new projects).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
