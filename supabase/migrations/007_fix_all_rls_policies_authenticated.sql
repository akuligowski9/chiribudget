-- Migration: Fix ALL RLS policies to apply to authenticated role
--
-- Bug: All policies were missing "TO authenticated", so they only applied
-- to the PUBLIC/anon role. This caused RLS violations for logged-in users.
--
-- This app requires authentication for everything, so all policies
-- should explicitly target the authenticated role.

-- ============================================
-- HOUSEHOLDS
-- ============================================
drop policy if exists households_read on households;
create policy households_read on households
for select to authenticated
using (is_household_member(id));

drop policy if exists households_insert on households;
create policy households_insert on households
for insert to authenticated
with check (auth.uid() is not null);

-- ============================================
-- HOUSEHOLD MEMBERS
-- ============================================
drop policy if exists members_read on household_members;
create policy members_read on household_members
for select to authenticated
using (is_household_member(household_id));

drop policy if exists members_insert on household_members;
create policy members_insert on household_members
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists members_delete on household_members;
create policy members_delete on household_members
for delete to authenticated
using (
  is_household_member(household_id)
  and auth.uid() != user_id
);

-- ============================================
-- PROFILES
-- ============================================
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles
for select to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from household_members hm1, household_members hm2
    where hm1.user_id = auth.uid()
      and hm2.user_id = profiles.user_id
      and hm1.household_id = hm2.household_id
  )
);

drop policy if exists profiles_upsert_self on profiles;
create policy profiles_upsert_self on profiles
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ============================================
-- BUDGET CONFIG
-- ============================================
drop policy if exists budget_config_read on budget_config;
create policy budget_config_read on budget_config
for select to authenticated
using (is_household_member(household_id));

drop policy if exists budget_config_upsert on budget_config;
create policy budget_config_upsert on budget_config
for insert to authenticated
with check (is_household_member(household_id));

drop policy if exists budget_config_update on budget_config;
create policy budget_config_update on budget_config
for update to authenticated
using (is_household_member(household_id))
with check (is_household_member(household_id));

-- ============================================
-- TRANSACTIONS
-- ============================================
drop policy if exists tx_read on transactions;
create policy tx_read on transactions
for select to authenticated
using (
  is_household_member(household_id)
  AND (deleted_at IS NULL OR deleted_at > now() - interval '30 days')
);

drop policy if exists tx_insert on transactions;
create policy tx_insert on transactions
for insert to authenticated
with check (is_household_member(household_id));

drop policy if exists tx_update on transactions;
create policy tx_update on transactions
for update to authenticated
using (is_household_member(household_id))
with check (is_household_member(household_id));

drop policy if exists tx_delete on transactions;
create policy tx_delete on transactions
for delete to authenticated
using (is_household_member(household_id));

-- ============================================
-- MONTH STATUS
-- ============================================
drop policy if exists ms_read on month_status;
create policy ms_read on month_status
for select to authenticated
using (is_household_member(household_id));

drop policy if exists ms_insert on month_status;
create policy ms_insert on month_status
for insert to authenticated
with check (is_household_member(household_id));

drop policy if exists ms_update on month_status;
create policy ms_update on month_status
for update to authenticated
using (is_household_member(household_id))
with check (is_household_member(household_id));

-- ============================================
-- IMPORT BATCHES
-- ============================================
drop policy if exists ib_read on import_batches;
create policy ib_read on import_batches
for select to authenticated
using (is_household_member(household_id));

drop policy if exists ib_insert on import_batches;
create policy ib_insert on import_batches
for insert to authenticated
with check (is_household_member(household_id));

drop policy if exists ib_update on import_batches;
create policy ib_update on import_batches
for update to authenticated
using (is_household_member(household_id))
with check (is_household_member(household_id));

-- ============================================
-- ERRORS
-- ============================================
drop policy if exists err_read on errors;
create policy err_read on errors
for select to authenticated
using (household_id is null or is_household_member(household_id));

drop policy if exists err_insert on errors;
create policy err_insert on errors
for insert to authenticated
with check (auth.uid() = user_id);

-- ============================================
-- RECURRING TRANSACTIONS (from migration 003)
-- ============================================
drop policy if exists recurring_transactions_select on recurring_transactions;
create policy recurring_transactions_select on recurring_transactions
for select to authenticated
using (is_household_member(household_id));

drop policy if exists recurring_transactions_insert on recurring_transactions;
create policy recurring_transactions_insert on recurring_transactions
for insert to authenticated
with check (is_household_member(household_id));

drop policy if exists recurring_transactions_update on recurring_transactions;
create policy recurring_transactions_update on recurring_transactions
for update to authenticated
using (is_household_member(household_id))
with check (is_household_member(household_id));

drop policy if exists recurring_transactions_delete on recurring_transactions;
create policy recurring_transactions_delete on recurring_transactions
for delete to authenticated
using (is_household_member(household_id));

drop policy if exists recurring_exceptions_select on recurring_exceptions;
create policy recurring_exceptions_select on recurring_exceptions
for select to authenticated
using (
  exists (
    select 1 from recurring_transactions rt
    where rt.id = recurring_exceptions.recurring_id
      and is_household_member(rt.household_id)
  )
);

drop policy if exists recurring_exceptions_insert on recurring_exceptions;
create policy recurring_exceptions_insert on recurring_exceptions
for insert to authenticated
with check (
  exists (
    select 1 from recurring_transactions rt
    where rt.id = recurring_exceptions.recurring_id
      and is_household_member(rt.household_id)
  )
);

drop policy if exists recurring_exceptions_delete on recurring_exceptions;
create policy recurring_exceptions_delete on recurring_exceptions
for delete to authenticated
using (
  exists (
    select 1 from recurring_transactions rt
    where rt.id = recurring_exceptions.recurring_id
      and is_household_member(rt.household_id)
  )
);
