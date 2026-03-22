-- Restore vector storage columns dropped by prisma db push --accept-data-loss
-- Run: psql -U hata1234 knowledge_hub -f scripts/restore-vectors.sql

BEGIN;

-- Ensure pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to Entry if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Entry' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE "Entry" ADD COLUMN embedding vector(1024);
  END IF;
END $$;

-- Create entry_chunks table if not exists
CREATE TABLE IF NOT EXISTS entry_chunks (
  id         SERIAL PRIMARY KEY,
  entry_id   INTEGER NOT NULL REFERENCES "Entry"(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  chunk_text  TEXT NOT NULL,
  context_text TEXT,
  embedding   vector(1024),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on entry_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_entry_chunks_entry_id ON entry_chunks(entry_id);

-- HNSW index for cosine similarity search on chunks
CREATE INDEX IF NOT EXISTS idx_entry_chunks_embedding_hnsw
  ON entry_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- HNSW index on Entry.embedding for legacy fallback
CREATE INDEX IF NOT EXISTS idx_entry_embedding_hnsw
  ON "Entry" USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

COMMIT;
