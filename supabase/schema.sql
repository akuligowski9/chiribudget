-- =========================
-- ChiriBudget - Supabase schema
-- =========================

-- Extensions
create extension if not exists pgcrypto;

-- Enums
-- Note: payer is now TEXT (not enum) to support dynamic household member names

do $$ begin
  create type currency_t as enum ('USD', 'PEN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type month_status_t as enum ('draft', 'discussed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type import_status_t as enum ('processing', 'staged', 'confirmed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_status_t as enum ('pending', 'confirmed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_bank_t as enum ('interbank', 'bcp', 'bbva', 'scotiabank', 'pnc', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_type_t as enum ('screenshot', 'pdf', 'csv', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type category_t as enum (
    'Fixed Expenses',
    'Rent/Mortgages',
    'Food',
    'Dogs',
    'Holidays & Birthdays',
    'Adventure',
    'Unexpected',
    'Salary',
    'Investments',
    'Extra'
  );
exception when duplicate_object then null; end $$;

-- -------------------------
-- Households
-- -------------------------
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Household',
  join_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);

-- Members
create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Profiles: stores which household a user is currently using
create table if not exists profiles (
  user_id uuid primary key,
  household_id uuid references households(id) on delete set null,
  display_name text,
  default_currency currency_t not null default 'USD',
  preferred_language text not null default 'es', -- 'en' or 'es'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on profiles;
create trigger trg_profiles_updated_at
before update on profiles
for each row execute function set_profiles_updated_at();

-- -------------------------
-- Budget config per household
-- -------------------------
create table if not exists budget_config (
  household_id uuid primary key references households(id) on delete cascade,
  usd_threshold numeric(12,2) not null default 500,
  fx_usd_to_pen numeric(12,4) not null default 3.25,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function set_budget_config_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_budget_config_updated_at on budget_config;
create trigger trg_budget_config_updated_at
before update on budget_config
for each row execute function set_budget_config_updated_at();

-- -------------------------
-- Transactions
-- -------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,

  txn_date date not null,
  currency currency_t not null,

  description text,
  amount numeric(12,2) not null, -- negative = expense, positive = income

  category category_t not null,
  payer text not null, -- display_name from profiles, or 'Together'

  -- Flagging workflow (notes not required per-transaction by default)
  is_flagged boolean not null default false,
  flag_reason text,
  explanation text,
  resolved_at timestamptz,

  source text not null default 'manual', -- manual | import
  import_batch_id uuid,

  -- Status for unsorted transactions flow
  status transaction_status_t not null default 'confirmed', -- pending = needs categorization

  -- Dedupe
  fingerprint text not null,

  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz,

  -- Soft delete support (CB-012)
  deleted_at timestamptz,
  deleted_by uuid
);

-- Trigger to auto-populate updated_by and updated_at on transaction updates
create or replace function set_transaction_updated()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_transaction_updated on transactions;
create trigger trg_transaction_updated
before update on transactions
for each row execute function set_transaction_updated();

-- Unique fingerprint per household prevents duplicate imports
create unique index if not exists idx_txn_fingerprint_unique
on transactions (household_id, fingerprint);

-- Index for efficient filtering of non-deleted rows (CB-012)
create index if not exists idx_txn_deleted_at on transactions (deleted_at)
where deleted_at is null;

-- Index for filtering pending (unsorted) transactions
create index if not exists idx_txn_pending on transactions (household_id, status)
where status = 'pending';

-- Soft delete function (CB-012)
create or replace function soft_delete_transaction(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  update transactions
  set deleted_at = now(),
      deleted_by = auth.uid()
  where id = p_transaction_id
    and is_household_member(household_id)
    and deleted_at is null;
  return found;
end;
$$;

-- Restore function (CB-012)
create or replace function restore_transaction(p_transaction_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  update transactions
  set deleted_at = null,
      deleted_by = null
  where id = p_transaction_id
    and is_household_member(household_id)
    and deleted_at is not null;
  return found;
end;
$$;

grant execute on function soft_delete_transaction(uuid) to authenticated;
grant execute on function restore_transaction(uuid) to authenticated;

-- Link import_batch_id after import_batches exists (later via FK)
-- We'll add FK after import_batches table.

-- -------------------------
-- Month status + discussion notes (per currency)
-- -------------------------
create table if not exists month_status (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  month text not null, -- YYYY-MM
  currency currency_t not null,
  status month_status_t not null default 'draft',
  discussion_notes text,
  discussed_at timestamptz,
  discussed_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, month, currency)
);

create or replace function set_month_status_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_month_status_updated_at on month_status;
create trigger trg_month_status_updated_at
before update on month_status
for each row execute function set_month_status_updated_at();

-- -------------------------
-- Import batches (staging -> confirm)
-- -------------------------
create table if not exists import_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  currency currency_t not null,
  month text not null, -- YYYY-MM
  profile_key text, -- e.g. alex_bank, adriana_bank (optional)
  raw_payload jsonb not null,
  parsed_preview jsonb,
  status import_status_t not null default 'staged',

  -- Source document tracking
  source_file_url text, -- URL to file in Supabase Storage
  source_type source_type_t default 'screenshot',
  source_bank source_bank_t default 'other',
  default_payer text, -- display_name from profiles
  txn_year integer, -- Year when dates don't include it
  date_range_start date,
  date_range_end date,
  display_name text, -- Human-readable name for UI

  created_by uuid not null,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

alter table transactions
  add constraint fk_transactions_import_batch
  foreign key (import_batch_id) references import_batches(id) on delete set null;

-- -------------------------
-- Error logging
-- -------------------------
create table if not exists errors (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete set null,
  user_id uuid,
  context text not null,
  message text not null,
  payload_snapshot jsonb,
  created_at timestamptz not null default now()
);

-- -------------------------
-- Helper functions for security & rules
-- -------------------------

-- Is caller a member of household?
create or replace function is_household_member(hid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
  );
$$;

-- Get threshold for currency
create or replace function get_threshold(hid uuid, cur currency_t)
returns numeric language plpgsql stable as $$
declare
  usd_thr numeric;
  fx numeric;
begin
  select usd_threshold, fx_usd_to_pen
    into usd_thr, fx
  from budget_config
  where household_id = hid;

  if usd_thr is null then
    usd_thr := 500;
    fx := 3.25;
  end if;

  if cur = 'USD' then
    return usd_thr;
  else
    return round(usd_thr * fx, 2);
  end if;
end;
$$;

-- Enforce flagging + category override rules based on thresholds
create or replace function enforce_budget_rules()
returns trigger language plpgsql as $$
declare
  thr numeric;
begin
  thr := get_threshold(new.household_id, new.currency);

  -- Expense over threshold -> Unexpected + flagged
  if new.amount < 0 and abs(new.amount) > thr then
    new.category := 'Unexpected';
    new.is_flagged := true;
    new.flag_reason := 'over_threshold_expense';
  end if;

  -- Income over threshold -> Extra + flagged
  if new.amount > 0 and new.amount > thr then
    new.category := 'Extra';
    new.is_flagged := true;
    new.flag_reason := 'over_threshold_income';
  end if;

  -- Resolve timestamp if explanation added
  if new.explanation is not null and length(trim(new.explanation)) > 0 then
    new.resolved_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_budget_rules on transactions;
create trigger trg_enforce_budget_rules
before insert or update on transactions
for each row execute function enforce_budget_rules();

-- -------------------------
-- Row Level Security (RLS)
-- -------------------------
alter table households enable row level security;
alter table household_members enable row level security;
alter table profiles enable row level security;
alter table budget_config enable row level security;
alter table transactions enable row level security;
alter table month_status enable row level security;
alter table import_batches enable row level security;
alter table errors enable row level security;

-- Households: read if member, insert if authenticated
drop policy if exists households_read on households;
create policy households_read on households
for select using (is_household_member(id));

drop policy if exists households_insert on households;
create policy households_insert on households
for insert with check (auth.uid() is not null);

-- Household members: read if in same household; insert yourself via join flow controlled app-side
drop policy if exists members_read on household_members;
create policy members_read on household_members
for select using (is_household_member(household_id));

drop policy if exists members_insert on household_members;
create policy members_insert on household_members
for insert with check (auth.uid() = user_id);

-- Members can remove other members from their household (but not themselves)
drop policy if exists members_delete on household_members;
create policy members_delete on household_members
for delete using (
  is_household_member(household_id)
  and auth.uid() != user_id
);

-- Profiles: user can read their own profile and profiles of household members
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles
for select using (
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
for insert with check (auth.uid() = user_id);

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Budget config: members read/write config for their household
drop policy if exists budget_config_read on budget_config;
create policy budget_config_read on budget_config
for select using (is_household_member(household_id));

drop policy if exists budget_config_upsert on budget_config;
create policy budget_config_upsert on budget_config
for insert with check (is_household_member(household_id));

drop policy if exists budget_config_update on budget_config;
create policy budget_config_update on budget_config
for update using (is_household_member(household_id)) with check (is_household_member(household_id));

-- Transactions: members CRUD
drop policy if exists tx_read on transactions;
create policy tx_read on transactions
for select using (
  is_household_member(household_id)
  AND (deleted_at IS NULL OR deleted_at > now() - interval '30 days')
);

drop policy if exists tx_insert on transactions;
create policy tx_insert on transactions
for insert with check (is_household_member(household_id));

drop policy if exists tx_update on transactions;
create policy tx_update on transactions
for update using (is_household_member(household_id)) with check (is_household_member(household_id));

drop policy if exists tx_delete on transactions;
create policy tx_delete on transactions
for delete using (is_household_member(household_id));

-- Month status: members CRUD
drop policy if exists ms_read on month_status;
create policy ms_read on month_status
for select using (is_household_member(household_id));

drop policy if exists ms_insert on month_status;
create policy ms_insert on month_status
for insert with check (is_household_member(household_id));

drop policy if exists ms_update on month_status;
create policy ms_update on month_status
for update using (is_household_member(household_id)) with check (is_household_member(household_id));

-- Import batches: members CRUD
drop policy if exists ib_read on import_batches;
create policy ib_read on import_batches
for select using (is_household_member(household_id));

drop policy if exists ib_insert on import_batches;
create policy ib_insert on import_batches
for insert with check (is_household_member(household_id));

drop policy if exists ib_update on import_batches;
create policy ib_update on import_batches
for update using (is_household_member(household_id)) with check (is_household_member(household_id));

-- Errors: members can insert; read within household
drop policy if exists err_read on errors;
create policy err_read on errors
for select using (household_id is null or is_household_member(household_id));

drop policy if exists err_insert on errors;
create policy err_insert on errors
for insert with check (auth.uid() = user_id);

-- -------------------------
-- Performance Indexes
-- -------------------------

-- Index for dashboard and export queries (filter by household, currency, date range)
CREATE INDEX IF NOT EXISTS idx_transactions_household_currency_date
ON transactions (household_id, currency, txn_date);

-- Index for flagged transaction review queries
CREATE INDEX IF NOT EXISTS idx_transactions_household_flagged
ON transactions (household_id, is_flagged)
WHERE is_flagged = true;

-- Index for month_status lookups (dashboard discussion panel)
CREATE INDEX IF NOT EXISTS idx_month_status_household_month_currency
ON month_status (household_id, month, currency);

-- -------------------------
-- Guidelines (optional feature)
-- -------------------------

-- Add guidelines columns to budget_config
ALTER TABLE budget_config
ADD COLUMN IF NOT EXISTS guidelines text,
ADD COLUMN IF NOT EXISTS guidelines_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS guidelines_updated_by uuid;

COMMENT ON COLUMN budget_config.guidelines IS 'Household rules and guidelines markdown/text';
COMMENT ON COLUMN budget_config.guidelines_updated_at IS 'When guidelines were last edited';
COMMENT ON COLUMN budget_config.guidelines_updated_by IS 'User ID who last edited guidelines';

-- -------------------------
-- Batch Insert Function (CB-011)
-- -------------------------

-- Function to insert transactions in batch with proper error handling
-- Returns: { inserted: number, skipped: number, failed_at: null | index, error: null | string }
create or replace function batch_insert_transactions(
  p_transactions jsonb
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_inserted int := 0;
  v_skipped int := 0;
  v_tx jsonb;
  v_idx int := 0;
  v_fingerprint text;
begin
  -- Loop through each transaction
  for v_tx in select * from jsonb_array_elements(p_transactions)
  loop
    v_idx := v_idx + 1;

    -- Check if fingerprint already exists (skip duplicates)
    v_fingerprint := v_tx->>'fingerprint';

    if exists (
      select 1 from transactions
      where household_id = (v_tx->>'household_id')::uuid
        and fingerprint = v_fingerprint
    ) then
      -- Skip duplicate
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Insert the transaction
    begin
      insert into transactions (
        household_id, txn_date, currency, description, amount,
        category, payer, is_flagged, flag_reason, source,
        import_batch_id, fingerprint, created_by
      ) values (
        (v_tx->>'household_id')::uuid,
        (v_tx->>'txn_date')::date,
        v_tx->>'currency',
        v_tx->>'description',
        (v_tx->>'amount')::numeric,
        v_tx->>'category',
        v_tx->>'payer',
        (v_tx->>'is_flagged')::boolean,
        v_tx->>'flag_reason',
        v_tx->>'source',
        (v_tx->>'import_batch_id')::uuid,
        v_fingerprint,
        (v_tx->>'created_by')::uuid
      );
      v_inserted := v_inserted + 1;
    exception when unique_violation then
      -- Handle race condition where another insert happened
      v_skipped := v_skipped + 1;
    end;
  end loop;

  return jsonb_build_object(
    'inserted', v_inserted,
    'skipped', v_skipped,
    'failed_at', null,
    'error', null
  );
exception when others then
  -- Any other error: return error info for client to handle
  return jsonb_build_object(
    'inserted', v_inserted,
    'skipped', v_skipped,
    'failed_at', v_idx,
    'error', SQLERRM
  );
end;
$$;

grant execute on function batch_insert_transactions(jsonb) to authenticated;

comment on function batch_insert_transactions is
  'Inserts transactions in batch, skipping duplicates. Returns { inserted, skipped, failed_at, error }';

-- -------------------------
-- User Language Preference (CB-030)
-- -------------------------

-- Add preferred_language to profiles for existing databases
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'es';

COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language code (en or es)';
