-- =========================
-- ChiriBudget - Supabase schema
-- =========================

-- Extensions
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  create type payer_t as enum ('alex', 'adriana', 'together');
exception when duplicate_object then null; end $$;

do $$ begin
  create type currency_t as enum ('USD', 'PEN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type month_status_t as enum ('draft', 'discussed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type import_status_t as enum ('staged', 'confirmed', 'rejected');
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
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- Profiles: stores which household a user is currently using
create table if not exists profiles (
  user_id uuid primary key,
  household_id uuid references households(id) on delete set null,
  display_name text,
  default_currency currency_t not null default 'USD',
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
  payer payer_t not null,

  -- Flagging workflow (notes not required per-transaction by default)
  is_flagged boolean not null default false,
  flag_reason text,
  explanation text,
  resolved_at timestamptz,

  source text not null default 'manual', -- manual | import
  import_batch_id uuid,

  -- Dedupe
  fingerprint text not null,

  created_by uuid not null,
  created_at timestamptz not null default now()
);

-- Unique fingerprint per household prevents duplicate imports
create unique index if not exists idx_txn_fingerprint_unique
on transactions (household_id, fingerprint);

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

-- Households: read if member
drop policy if exists households_read on households;
create policy households_read on households
for select using (is_household_member(id));

-- Household members: read if in same household; insert yourself via join flow controlled app-side
drop policy if exists members_read on household_members;
create policy members_read on household_members
for select using (is_household_member(household_id));

drop policy if exists members_insert on household_members;
create policy members_insert on household_members
for insert with check (auth.uid() = user_id);

-- Profiles: user can read/write their own
drop policy if exists profiles_self on profiles;
create policy profiles_self on profiles
for select using (auth.uid() = user_id);

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
for select using (is_household_member(household_id));

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
