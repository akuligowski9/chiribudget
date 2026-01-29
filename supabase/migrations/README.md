# Database Migrations

This folder contains all database migrations for ChiriBudget.

## Migration Files

| File                             | Description                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------- |
| `001_base_schema.sql`            | Complete base schema: tables, enums, indexes, triggers, RLS policies, functions |
| `002_category_limits.sql`        | Adds `category_limits` JSONB column to `budget_config`                          |
| `003_recurring_transactions.sql` | Adds recurring transactions feature (tables, indexes, RLS)                      |

## Setup Instructions

### Fresh Local Development Setup

```bash
# 1. Start Supabase (runs all migrations automatically)
npx supabase start

# 2. Verify migrations applied
npx supabase migration list
```

### Reset Local Database

```bash
# Stop and remove all data, then restart fresh
npx supabase db reset
```

### Production Setup (Supabase Dashboard)

For a new Supabase project:

1. Go to SQL Editor in Supabase Dashboard
2. Run migrations in order: `001_base_schema.sql`, then `002_category_limits.sql`, etc.
3. Verify tables created in Table Editor

### Push to Linked Production

```bash
# Push pending migrations to linked Supabase project
npx supabase db push
```

## Adding New Migrations

1. Create a new file with the next sequential number: `004_your_feature.sql`
2. Make migrations **idempotent** where possible:
   - Use `CREATE TABLE IF NOT EXISTS`
   - Use `CREATE INDEX IF NOT EXISTS`
   - Use `DROP ... IF EXISTS` before `CREATE` for triggers/policies
   - Wrap enum creation in `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;`
3. Test locally with `npx supabase db reset`
4. Commit the migration file

## Versioning Rules

- Use simple sequential numbers: `001_`, `002_`, `003_`
- Never reuse a version number
- Never modify a migration that has been applied to production
- For production fixes, create a new migration

## Troubleshooting

**"duplicate key" error on `supabase start`:**

- Migrations have duplicate version numbers. Ensure each file has a unique prefix.

**Migration partially applied:**

- Run `npx supabase db reset` to start fresh locally.

**Production schema out of sync:**

- Compare local schema with production using `npx supabase db diff`
- Create a new migration to reconcile differences
