# Database Backup & Recovery

This document covers backup procedures for ChiriBudget's Supabase database.

## Automatic Backups (Supabase)

Supabase provides automated backups based on your plan:

| Plan | Backup Frequency      | Retention |
| ---- | --------------------- | --------- |
| Free | Daily                 | 7 days    |
| Pro  | Daily                 | 7 days    |
| Team | Daily + Point-in-time | 7 days    |

**Note:** Free tier backups are automatic but restoration requires contacting Supabase support.

## Accessing Backups

### Via Supabase Dashboard

1. Go to [supabase.com](https://supabase.com) and log in
2. Select your project
3. Navigate to **Settings** > **Database**
4. Scroll to **Backups** section
5. View available backup points

### Backup Schedule

- Backups run daily at approximately 00:00 UTC
- Each backup is a full database snapshot
- Includes all tables, functions, and RLS policies

## Manual Data Export

For local backups, you can export data using the Supabase CLI or SQL.

### Option 1: CSV Export via App

The app includes a CSV export feature:

1. Go to the home page
2. Click **Export**
3. Select month and currency
4. Download CSV file

This exports transactions only, not configuration data.

### Option 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Dump the database
supabase db dump -f backup.sql
```

### Option 3: Direct SQL Export

Connect to your database and run:

```sql
-- Export transactions
COPY (SELECT * FROM transactions WHERE household_id = 'YOUR_HOUSEHOLD_ID')
TO '/tmp/transactions.csv' WITH CSV HEADER;

-- Export all tables (requires admin access)
pg_dump -h YOUR_HOST -U postgres -d postgres > full_backup.sql
```

## Restoration Procedures

### Restoring from Supabase Backup

**Pro/Team plans:**

1. Go to **Settings** > **Database** > **Backups**
2. Select the backup point
3. Click **Restore**
4. Confirm the restoration

**Free tier:**

1. Contact Supabase support via dashboard
2. Request restoration from a specific date
3. Support will restore the backup

### Restoring from SQL Dump

```bash
# Restore to a fresh database
psql -h YOUR_HOST -U postgres -d postgres < backup.sql

# Or restore specific tables
psql -h YOUR_HOST -U postgres -d postgres -c "\copy transactions FROM 'transactions.csv' CSV HEADER"
```

### Restoring from CSV Export

If you only have CSV exports:

1. Re-import via the app's Import feature
2. Or use SQL:

```sql
-- Clear existing transactions (careful!)
DELETE FROM transactions WHERE household_id = 'YOUR_HOUSEHOLD_ID';

-- Import from CSV
COPY transactions (txn_date, currency, amount, category, payer, description, household_id)
FROM '/tmp/transactions.csv' WITH CSV HEADER;
```

## Point-in-Time Recovery (PITR)

Available on Team plan and above:

1. Go to **Settings** > **Database** > **Backups**
2. Select **Point-in-Time Recovery**
3. Choose exact timestamp
4. Confirm restoration

PITR allows recovery to any point within the retention window.

## Best Practices

### Regular Local Backups

1. **Weekly:** Export transactions via CSV
2. **Monthly:** Run `supabase db dump` for full backup
3. **Store backups** in multiple locations (cloud storage, local drive)

### Before Major Changes

Always create a backup before:

- Running database migrations
- Bulk deleting transactions
- Modifying RLS policies
- Changing schema

### Testing Restores

Periodically verify backups work:

1. Create a test Supabase project
2. Restore a backup to it
3. Verify data integrity
4. Delete test project

## Data Integrity Checks

After restoration, verify:

```sql
-- Count transactions by household
SELECT household_id, COUNT(*) FROM transactions GROUP BY household_id;

-- Check for orphaned records
SELECT * FROM transactions t
WHERE NOT EXISTS (SELECT 1 FROM households h WHERE h.id = t.household_id);

-- Verify RLS is working
SELECT current_user, session_user;
```

## Emergency Contacts

- **Supabase Support:** Dashboard > Help > Contact Support
- **Status Page:** [status.supabase.com](https://status.supabase.com)

## Related Documentation

- [Supabase Backup Docs](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [TECH_SPEC.md](./TECH_SPEC.md) - Technical specification
