-- ============================================================
-- InterCompany Group Chat Migration
-- Add is_permanent column to thread_participants
-- ============================================================
-- Purpose: Marks participants who cannot leave and cannot be removed
--          (the two company owners in an InterCompany thread).
-- Run this on Supabase SQL editor, then update supabase_current_state.sql.
-- ============================================================

ALTER TABLE thread_participants
  ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN NOT NULL DEFAULT FALSE;

