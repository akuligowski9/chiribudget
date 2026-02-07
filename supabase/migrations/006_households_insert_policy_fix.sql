-- Migration: Re-apply missing INSERT policy on households table
-- This fixes production where the policy was missing from the original setup
--
-- Root cause: Production DB was set up manually from setup_fresh_db.sql
-- BEFORE the INSERT policy was added. Migrations 001-004 were marked as
-- applied (schema exists) but the INSERT policy was never actually created.
--
-- This migration is idempotent - safe to run even if policy exists.

drop policy if exists households_insert on households;
create policy households_insert on households
for insert with check (auth.uid() is not null);
