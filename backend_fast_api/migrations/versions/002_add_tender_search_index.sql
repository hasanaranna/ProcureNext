-- ============================================================
-- Migration: Add full-text search column + index to TENDERS
-- ============================================================
-- Supports hybrid tender search (FR-03): this full-text column is fused with
-- the existing pgvector `embedding` column at query time.
--
-- Purely additive - no existing rows, columns, or tables are modified or
-- dropped. Both statements are idempotent and safe to re-run.
--
-- Applied automatically on backend startup via create_tender_search_index()
-- in db.py. For manual application against the remote DB, run these
-- statements in order:
-- ============================================================

-- Two-argument to_tsvector('english', ...) is required: it is IMMUTABLE,
-- which a GENERATED ALWAYS AS ... STORED expression demands.
-- Title is weighted 'A' (highest) and description 'B'.
ALTER TABLE tenders ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
    setweight(to_tsvector('english', title), 'A') ||
    setweight(to_tsvector('english', description), 'B')
) STORED;

CREATE INDEX IF NOT EXISTS idx_tenders_search_vector ON tenders USING GIN (search_vector);
