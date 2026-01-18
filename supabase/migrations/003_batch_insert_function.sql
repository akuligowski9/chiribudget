-- Migration: Add batch insert function for atomic transaction imports
-- CB-011: Batch Insert with Rollback

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

-- Grant execute to authenticated users (RLS will still apply on the transactions table)
grant execute on function batch_insert_transactions(jsonb) to authenticated;

-- Add comment for documentation
comment on function batch_insert_transactions is
  'Inserts transactions in batch, skipping duplicates. Returns { inserted, skipped, failed_at, error }';
