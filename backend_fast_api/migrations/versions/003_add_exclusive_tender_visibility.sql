-- ============================================================
-- Migration: Add 'Exclusive' to the tender_visibility enum
-- ============================================================
-- Supports the "Exclusive Tender — restricted to your enlisted vendors"
-- option on the new-tender form. Previously the enum only defined 'Public'
-- and 'Restricted', so submitting a tender with this option failed
-- validation before it ever reached the database.
--
-- Purely additive - the existing 'Public' and 'Restricted' values are
-- untouched, and no existing rows are modified. Safe to re-run
-- (ADD VALUE IF NOT EXISTS).
--
-- Applied automatically on backend startup via
-- ensure_exclusive_tender_visibility() in db.py. For manual application
-- against the remote DB, run this statement:
-- ============================================================

ALTER TYPE tender_visibility ADD VALUE IF NOT EXISTS 'Exclusive';
