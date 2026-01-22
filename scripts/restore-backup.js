#!/usr/bin/env node
/**
 * Restore script for ChiriBudget backups
 *
 * Usage:
 *   node scripts/restore-backup.js <backup-file.json> [--dry-run]
 *
 * Options:
 *   --dry-run    Show what would be restored without making changes
 *   --force      Skip confirmation prompt
 *
 * Example:
 *   node scripts/restore-backup.js backup-2026-01-22.json --dry-run
 */

const fs = require('fs');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

// Tables in order of restoration (respects foreign key dependencies)
const RESTORE_ORDER = [
  'households',
  'profiles',
  'budget_config',
  'month_status',
  'import_batches',
  'transactions',
];

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function restore() {
  const args = process.argv.slice(2);
  const backupFile = args.find((a) => !a.startsWith('--'));
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  if (!backupFile) {
    console.error(
      'Usage: node restore-backup.js <backup-file.json> [--dry-run]'
    );
    process.exit(1);
  }

  // Check environment variables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables:');
    console.error('  SUPABASE_URL - Your Supabase project URL');
    console.error('  SUPABASE_SERVICE_KEY - Your Supabase service role key');
    console.error('\nExample:');
    console.error(
      '  SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx node scripts/restore-backup.js backup.json'
    );
    process.exit(1);
  }

  // Read backup file
  let backup;
  try {
    const content = fs.readFileSync(backupFile, 'utf-8');
    backup = JSON.parse(content);
  } catch (err) {
    console.error(`Failed to read backup file: ${err.message}`);
    process.exit(1);
  }

  console.log('\n=== ChiriBudget Backup Restore ===\n');
  console.log(`Backup file: ${backupFile}`);
  console.log(`Backup timestamp: ${backup.timestamp}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE RESTORE'}`);
  console.log('\nData to restore:');

  // Show summary
  let totalRows = 0;
  for (const table of RESTORE_ORDER) {
    const data = backup.tables[table];
    if (Array.isArray(data)) {
      console.log(`  ${table}: ${data.length} rows`);
      totalRows += data.length;
    } else if (data?.error) {
      console.log(`  ${table}: SKIPPED (${data.error})`);
    } else {
      console.log(`  ${table}: SKIPPED (no data)`);
    }
  }
  console.log(`\nTotal: ${totalRows} rows`);

  if (dryRun) {
    console.log('\n✓ Dry run complete. No changes made.');
    console.log('  Remove --dry-run to perform actual restore.');
    return;
  }

  // Confirmation
  if (!force) {
    console.log('\n⚠️  WARNING: This will UPSERT data into your database.');
    console.log('   Existing records with matching IDs will be overwritten.');
    const answer = await prompt('\nType "RESTORE" to confirm: ');
    if (answer !== 'RESTORE') {
      console.log('Restore cancelled.');
      process.exit(0);
    }
  }

  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('\nRestoring...\n');

  // Restore each table
  for (const table of RESTORE_ORDER) {
    const data = backup.tables[table];

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`  ${table}: skipped (no data)`);
      continue;
    }

    try {
      const { error } = await supabase
        .from(table)
        .upsert(data, { onConflict: 'id' });

      if (error) {
        console.error(`  ${table}: FAILED - ${error.message}`);
      } else {
        console.log(`  ${table}: ✓ ${data.length} rows restored`);
      }
    } catch (err) {
      console.error(`  ${table}: FAILED - ${err.message}`);
    }
  }

  console.log('\n✓ Restore complete!');
}

restore().catch((err) => {
  console.error('Restore failed:', err);
  process.exit(1);
});
