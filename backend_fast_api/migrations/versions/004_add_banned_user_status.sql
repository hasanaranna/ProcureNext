-- ============================================================
-- Migration: Add 'Banned' to the user_status enum
-- ============================================================
-- The admin "Ban" action (PUT /api/auth/admin/modify-user-status) sets
-- users.status = 'Banned', but the enum only defined 'Active',
-- 'Suspended' and 'Pending', so every ban failed with
-- "invalid input value for enum user_status" - the user stayed Active,
-- no ban email was sent, and the banned-login message never showed.
--
-- Purely additive - existing values and rows are untouched. Safe to
-- re-run (ADD VALUE IF NOT EXISTS).
--
-- Applied automatically on backend startup via
-- ensure_banned_user_status() in db.py. For manual application
-- against the remote DB, run this statement:
-- ============================================================

ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'Banned';
