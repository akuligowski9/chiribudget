-- Migration: Fix missing INSERT policy on households table
-- CB-065: Bug fix - users couldn't create households due to RLS
--
-- Root cause: The households table only had a SELECT policy,
-- so authenticated users got "new row violates row-level security policy"
-- when trying to create a new household.

-- Add INSERT policy: any authenticated user can create a household
drop policy if exists households_insert on households;
create policy households_insert on households
for insert with check (auth.uid() is not null);
