#!/usr/bin/env node
/**
 * Seeds the local Supabase database with test fixture data.
 *
 * Usage:
 *   node scripts/seed-test-db.js [--clean]
 *
 * Options:
 *   --clean    Clear all test data before seeding
 *
 * Requires local Supabase to be running (npx supabase start)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Local Supabase credentials (from `npx supabase status -o env`)
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';

// Get service role key from environment or use default local key
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Tables in order of seeding (respects foreign key dependencies)
const SEED_ORDER = [
  'households',
  'profiles',
  'household_members',
  'budget_config',
  'month_status',
  'import_batches',
  'transactions',
  'recurring_transactions',
  'recurring_exceptions',
];

// Tables to clean in reverse order
const CLEAN_ORDER = [...SEED_ORDER].reverse();

// Tables with different primary key names
const PRIMARY_KEYS = {
  profiles: 'user_id',
  budget_config: 'household_id',
  household_members: 'household_id,user_id',
};

async function checkSupabaseRunning() {
  try {
    const response = await fetch(`${LOCAL_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: SERVICE_ROLE_KEY },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function seed() {
  const args = process.argv.slice(2);
  const shouldClean = args.includes('--clean');

  console.log('\n=== Seed Test Database ===\n');

  // Check if Supabase is running
  const isRunning = await checkSupabaseRunning();
  if (!isRunning) {
    console.error('❌ Local Supabase is not running.');
    console.error('   Start it with: npx supabase start');
    process.exit(1);
  }
  console.log('✓ Local Supabase is running');

  // Load seed data
  const seedPath = path.join(
    __dirname,
    '..',
    'test-fixtures',
    'seed-data.json'
  );
  let seedData;
  try {
    const content = fs.readFileSync(seedPath, 'utf-8');
    seedData = JSON.parse(content);
  } catch (err) {
    console.error(`❌ Failed to read seed data: ${err.message}`);
    process.exit(1);
  }
  console.log('✓ Loaded seed data from test-fixtures/seed-data.json');

  // Create Supabase client with service role (bypasses RLS)
  const supabase = createClient(LOCAL_SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Clean if requested
  if (shouldClean) {
    console.log('\nCleaning test data...');
    for (const table of CLEAN_ORDER) {
      try {
        const primaryKey = PRIMARY_KEYS[table] || 'id';
        // Delete test data (IDs starting with known test prefixes)
        const { error } = await supabase
          .from(table)
          .delete()
          .or(
            `${primaryKey}.like.11111111-%,${primaryKey}.like.22222222-%,${primaryKey}.like.33333333-%,${primaryKey}.like.44444444-%,${primaryKey}.like.55555555-%,${primaryKey}.like.66666666-%`
          );

        if (error && !error.message.includes('does not exist')) {
          console.log(`  ${table}: ⚠ ${error.message}`);
        } else {
          console.log(`  ${table}: ✓ cleaned`);
        }
      } catch (err) {
        console.log(`  ${table}: ⚠ ${err.message}`);
      }
    }
  }

  // Seed tables
  console.log('\nSeeding tables...');
  for (const table of SEED_ORDER) {
    const data = seedData[table];

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`  ${table}: skipped (no data)`);
      continue;
    }

    try {
      const primaryKey = PRIMARY_KEYS[table] || 'id';
      const { error } = await supabase
        .from(table)
        .upsert(data, { onConflict: primaryKey });

      if (error) {
        console.error(`  ${table}: ❌ ${error.message}`);
      } else {
        console.log(`  ${table}: ✓ ${data.length} rows`);
      }
    } catch (err) {
      console.error(`  ${table}: ❌ ${err.message}`);
    }
  }

  console.log('\n✓ Seeding complete!\n');
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
