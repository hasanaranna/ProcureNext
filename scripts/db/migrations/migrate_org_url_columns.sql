-- Run this in Supabase SQL Editor if you already applied init.sql with VARCHAR(50) columns.
ALTER TABLE organizations
    ALTER COLUMN tin_number TYPE TEXT,
    ALTER COLUMN bin_number TYPE TEXT;
