-- Migration 005: Import duplicate flags
-- Adds flag_source column to distinguish system-generated flags from user flags.
-- Values: 'import' (duplicate detection), 'threshold' (budget rules), 'category_limit', 'user'

-- 1. Add flag_source column (nullable text, no enum to avoid future migrations)
alter table transactions add column if not exists flag_source text;

-- 2. Backfill existing flagged rows with 'threshold' source
update transactions
set flag_source = 'threshold'
where is_flagged = true
  and flag_reason in ('over_threshold_expense', 'over_threshold_income')
  and flag_source is null;

-- 3. Update enforce_budget_rules() trigger to set flag_source = 'threshold'
create or replace function enforce_budget_rules()
returns trigger language plpgsql as $$
declare
  thr numeric;
begin
  thr := get_threshold(new.household_id, new.currency);

  if new.amount < 0 and abs(new.amount) > thr then
    new.category := 'Unexpected';
    new.is_flagged := true;
    new.flag_reason := 'over_threshold_expense';
    new.flag_source := 'threshold';
  end if;

  if new.amount > 0 and new.amount > thr then
    new.category := 'Extra';
    new.is_flagged := true;
    new.flag_reason := 'over_threshold_income';
    new.flag_source := 'threshold';
  end if;

  if new.explanation is not null and length(trim(new.explanation)) > 0 then
    new.resolved_at := now();
  end if;

  return new;
end;
$$;
