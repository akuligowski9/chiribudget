#!/usr/bin/env node
/**
 * Automated CSV import test against local Supabase.
 * Parses PNC Checking CSV → creates import batch → inserts transactions → reports.
 *
 * Usage: node scripts/test-csv-import.js [/path/to/csv]
 */
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// ── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const HOUSEHOLD_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';
const DEFAULT_PAYER = 'TestUser';
const DEFAULT_CATEGORY = 'Unexpected';

// ── Parser helpers (match app logic exactly) ────────────────────────────────
function normalizeDesc(s) {
  return (s || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function computeFingerprint({
  household_id,
  currency,
  txn_date,
  amount,
  description,
}) {
  const base = `${household_id}|${currency}|${txn_date}|${Number(amount).toFixed(2)}|${normalizeDesc(description)}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) >>> 0;
  return `fp_${h}`;
}

function makeUniqueFingerprint(baseFp, counter) {
  return `${baseFp}_dup${counter}`;
}

function parsePncCheckingAmount(str) {
  if (!str) return 0;
  const s = str.trim();
  const isNeg = s.startsWith('-');
  const isPos = s.startsWith('+');
  const cleaned = s.replace(/[+\-$,\s]/g, '');
  const val = parseFloat(cleaned) || 0;
  if (isNeg) return -val;
  if (isPos) return val;
  return val;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  if (clean.toUpperCase().startsWith('PENDING')) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  return null;
}

function parseCsvLine(line) {
  const row = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      row.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  row.push(current.trim());
  return row;
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const csvPath =
    process.argv[2] || '/Users/akuligowski/Downloads/accountActivityExport.csv';
  console.log('\n=== Automated CSV Import Test ===\n');
  console.log(`CSV:   ${csvPath}`);
  console.log(`DB:    ${SUPABASE_URL} (local)`);
  console.log(`User:  TestUser (${USER_ID})\n`);

  // Read and parse CSV
  const csv = fs.readFileSync(csvPath, 'utf-8');
  const lines = csv.trim().split('\n');
  const headers = parseCsvLine(lines[0]);
  console.log(`Headers: ${headers.join(', ')}`);

  // Verify PNC Checking format
  const lower = headers.map((h) => h.toLowerCase());
  if (
    !lower.includes('transaction date') ||
    !lower.includes('transaction description')
  ) {
    console.error('ERROR: Not a PNC Checking format CSV');
    process.exit(1);
  }
  console.log('Format: PNC Checking (auto-detected)\n');

  // Parse all rows
  const parsed = [];
  let skippedPending = 0;
  const rawPayload = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const row = parseCsvLine(lines[i]);
    const dateStr = row[0];
    const description = row[1];
    const amountStr = row[2];

    rawPayload.push({ date: dateStr, description, amount: amountStr });

    const txn_date = parseDate(dateStr);
    if (!txn_date) {
      skippedPending++;
      continue;
    }

    const amount = parsePncCheckingAmount(amountStr);
    parsed.push({ txn_date, description, amount });
  }

  console.log(
    `Parsed: ${parsed.length} transactions (${skippedPending} pending skipped)`
  );

  // Compute date range and month
  const dates = parsed.map((t) => t.txn_date).sort();
  const dateRangeStart = dates[0];
  const dateRangeEnd = dates[dates.length - 1];
  const month = dateRangeStart.substring(0, 7);
  console.log(`Range:  ${dateRangeStart} -> ${dateRangeEnd}`);
  console.log(`Month:  ${month}\n`);

  // Compute fingerprints and detect in-file duplicates
  const fpCounts = {};
  const transactions = [];

  for (const t of parsed) {
    const baseFp = computeFingerprint({
      household_id: HOUSEHOLD_ID,
      currency: 'USD',
      txn_date: t.txn_date,
      amount: t.amount,
      description: t.description,
    });

    fpCounts[baseFp] = (fpCounts[baseFp] || 0) + 1;
    const count = fpCounts[baseFp];
    const fingerprint =
      count > 1 ? makeUniqueFingerprint(baseFp, count) : baseFp;
    const isDuplicate = count > 1;

    transactions.push({
      household_id: HOUSEHOLD_ID,
      txn_date: t.txn_date,
      currency: 'USD',
      description: t.description,
      amount: t.amount,
      category: DEFAULT_CATEGORY,
      payer: DEFAULT_PAYER,
      is_flagged: isDuplicate,
      flag_reason: isDuplicate ? 'possible_duplicate' : null,
      flag_source: isDuplicate ? 'import' : null,
      source: 'csv',
      fingerprint,
      created_by: USER_ID,
      status: 'confirmed',
    });
  }

  // Report in-file duplicates
  const dupFps = Object.entries(fpCounts).filter(([, c]) => c > 1);
  if (dupFps.length > 0) {
    console.log(
      `In-file duplicates: ${dupFps.length} fingerprint(s) with multiple rows`
    );
    for (const [fp, count] of dupFps) {
      const match = transactions.find((t) => t.fingerprint === fp);
      console.log(
        `  ${fp}: ${count}x -- "${match?.description?.substring(0, 50)}"`
      );
    }
    console.log('');
  }

  // Connect to Supabase
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Check for existing fingerprints in DB
  const fps = transactions.map((t) => t.fingerprint);
  const { data: existing } = await supabase
    .from('transactions')
    .select('fingerprint')
    .eq('household_id', HOUSEHOLD_ID)
    .in('fingerprint', fps);

  const existingFps = new Set((existing || []).map((e) => e.fingerprint));
  const newTxns = transactions.filter((t) => !existingFps.has(t.fingerprint));
  const skippedDb = transactions.length - newTxns.length;

  if (skippedDb > 0) {
    console.log(`DB duplicates: ${skippedDb} already exist (skipped)`);
  }
  console.log(`New transactions to insert: ${newTxns.length}\n`);

  if (newTxns.length === 0) {
    console.log('Nothing to insert. All transactions already in DB.\n');
    return;
  }

  // Create import batch
  const displayName = `PNC Checking ${dateRangeStart.substring(5)} to ${dateRangeEnd.substring(5)} ${dateRangeEnd.substring(0, 4)}`;
  const { data: batch, error: batchErr } = await supabase
    .from('import_batches')
    .insert({
      household_id: HOUSEHOLD_ID,
      currency: 'USD',
      month,
      source_bank: 'pnc',
      default_payer: DEFAULT_PAYER,
      txn_year: parseInt(dateRangeEnd.substring(0, 4)),
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
      display_name: displayName,
      raw_payload: rawPayload,
      status: 'staged',
      created_by: USER_ID,
    })
    .select('id')
    .single();

  if (batchErr) {
    console.error('Failed to create import batch:', batchErr.message);
    process.exit(1);
  }
  console.log(`Import batch: ${batch.id}`);
  console.log(`  Name: ${displayName}\n`);

  // Link transactions to batch and insert
  const withBatch = newTxns.map((t) => ({ ...t, import_batch_id: batch.id }));
  let inserted = 0;
  let failed = 0;

  for (let i = 0; i < withBatch.length; i += 100) {
    const chunk = withBatch.slice(i, i + 100);
    const { data, error } = await supabase
      .from('transactions')
      .insert(chunk)
      .select(
        'id, txn_date, amount, description, is_flagged, flag_reason, flag_source'
      );

    if (error) {
      console.error(`Batch insert failed: ${error.message}`);
      failed += chunk.length;
    } else {
      inserted += data.length;
    }
  }

  // Re-query to see final state (budget trigger may have flagged more)
  const { data: allInserted } = await supabase
    .from('transactions')
    .select(
      'id, txn_date, amount, description, is_flagged, flag_reason, flag_source'
    )
    .eq('import_batch_id', batch.id)
    .order('txn_date', { ascending: true });

  const flagged = (allInserted || []).filter((t) => t.is_flagged);
  const income = (allInserted || []).filter((t) => t.amount > 0);
  const expenses = (allInserted || []).filter((t) => t.amount < 0);
  const totalIncome = income.reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = expenses.reduce((s, t) => s + Number(t.amount), 0);

  console.log('=== Results ===\n');
  console.log(`Inserted:  ${inserted}`);
  console.log(`Failed:    ${failed}`);
  console.log(
    `Skipped:   ${skippedPending} pending + ${skippedDb} DB duplicates`
  );
  console.log(`Income:    ${income.length} txns, +$${totalIncome.toFixed(2)}`);
  console.log(
    `Expenses:  ${expenses.length} txns, $${totalExpenses.toFixed(2)}`
  );
  console.log(`Flagged:   ${flagged.length} transactions\n`);

  if (flagged.length > 0) {
    console.log('--- Flagged Transactions ---');
    for (const f of flagged) {
      const src = (f.flag_source || '?').padEnd(14);
      const amt = ('$' + Number(f.amount).toFixed(2)).padStart(11);
      console.log(
        `  ${src} ${f.txn_date}  ${amt}  ${f.flag_reason}  ${(f.description || '').substring(0, 45)}`
      );
    }
    console.log('');
  }

  console.log('=== What happens next (real flow) ===\n');
  console.log(
    'Import batch is STAGED — transactions are in the DB but NOT on the dashboard.'
  );
  console.log('In the app, you would go to the "Unsorted" page to:');
  console.log('  1. Review each transaction');
  console.log('  2. Assign categories (currently all "Unexpected")');
  console.log('  3. Assign payers');
  console.log('  4. Confirm the batch to move transactions to the dashboard\n');
  console.log('View at http://localhost:3000 (login as TestUser)\n');
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
