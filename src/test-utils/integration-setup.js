/**
 * Integration test setup
 * Provides Supabase client configured for local testing
 */

const { createClient } = require('@supabase/supabase-js');

// Local Supabase credentials
const LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

// Test data IDs (from seed-data.json)
global.TEST_IDS = {
  HOUSEHOLD: '11111111-1111-1111-1111-111111111111',
  USER: '22222222-2222-2222-2222-222222222222',
  PARTNER: '33333333-3333-3333-3333-333333333333',
  BUDGET_CONFIG: '44444444-4444-4444-4444-444444444444',
  RECURRING_RENT: '66666666-6666-6666-6666-666666666661',
  RECURRING_NETFLIX: '66666666-6666-6666-6666-666666666662',
  RECURRING_SALARY: '66666666-6666-6666-6666-666666666663',
};

// Create Supabase client with service role (bypasses RLS for testing)
global.supabase = createClient(LOCAL_SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Helper to generate unique test UUIDs
// Uses crypto.randomUUID() for valid UUID format
global.testId = () => {
  return crypto.randomUUID();
};

// Helper to clean up test-created records
global.cleanupIds = [];
global.trackForCleanup = (table, id) => {
  global.cleanupIds.push({ table, id });
};

// Clean up after each test
afterEach(async () => {
  // Delete in reverse order to handle foreign keys
  const toDelete = [...global.cleanupIds].reverse();
  for (const { table, id } of toDelete) {
    try {
      await global.supabase.from(table).delete().eq('id', id);
    } catch {
      // Ignore cleanup errors
    }
  }
  global.cleanupIds = [];
});

// Verify Supabase is running before tests
beforeAll(async () => {
  try {
    const { error } = await global.supabase
      .from('households')
      .select('id')
      .limit(1);
    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }
  } catch (err) {
    console.error('\n❌ Local Supabase is not running or not seeded.');
    console.error('   Run: npx supabase start && npm run seed:test\n');
    throw err;
  }
});
