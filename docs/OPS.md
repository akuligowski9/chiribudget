# ChiriBudget Operations Runbook

Operational procedures for backup, recovery, security, and deployment.

For sensitive details (keys, internal URLs), see `OPS_PRIVATE.md` (gitignored).

---

## 1. Backup

### Automatic Backups (Supabase)

| Plan | Frequency             | Retention |
| ---- | --------------------- | --------- |
| Free | Daily                 | 7 days    |
| Pro  | Daily                 | 7 days    |
| Team | Daily + Point-in-time | 7 days    |

Backups run daily at ~00:00 UTC. Each backup is a full database snapshot including tables, functions, and RLS policies.

**Free tier note:** Restoration requires contacting Supabase support.

### Accessing Backups

1. Go to [supabase.com](https://supabase.com) and log in
2. Select your project
3. Navigate to **Settings** > **Database** > **Backups**
4. View available backup points

### Manual Data Export

**Option 1: CSV via App**

1. Go to home page → **Export**
2. Select month and currency
3. Download CSV (transactions only)

**Option 2: Supabase CLI**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db dump -f backup.sql
```

**Option 3: Direct SQL**

```sql
-- Export transactions for a household
COPY (SELECT * FROM transactions WHERE household_id = '<HOUSEHOLD_ID>')
TO '/tmp/transactions.csv' WITH CSV HEADER;
```

### Backup Best Practices

- **Weekly:** Export transactions via CSV
- **Monthly:** Run `supabase db dump` for full backup
- **Before migrations:** Always create a backup first
- **Store backups** in multiple locations

---

## 2. Recovery

### Restore from Supabase Backup

**Pro/Team plans:**

1. Go to **Settings** > **Database** > **Backups**
2. Select backup point → **Restore** → Confirm

**Free tier:**

1. Contact Supabase support via dashboard
2. Request restoration from specific date

### Restore from SQL Dump

```bash
psql -h <HOST> -U postgres -d postgres < backup.sql
```

### Restore from CSV

```sql
-- Clear existing (careful!)
DELETE FROM transactions WHERE household_id = '<HOUSEHOLD_ID>';

-- Import
COPY transactions (txn_date, currency, amount, category, payer, description, household_id)
FROM '/tmp/transactions.csv' WITH CSV HEADER;
```

### Data Integrity Checks (Post-Restore)

```sql
-- Count transactions by household
SELECT household_id, COUNT(*) FROM transactions GROUP BY household_id;

-- Check for orphaned records
SELECT * FROM transactions t
WHERE NOT EXISTS (SELECT 1 FROM households h WHERE h.id = t.household_id);

-- Verify RLS is working
SELECT current_user, session_user;
```

---

## 3. Security Model

### Row-Level Security (RLS)

All tables have RLS enabled. Core security function:

```sql
CREATE FUNCTION is_household_member(hh_id uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hh_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

This ensures:

- Users only see their own household's data
- Even with anon key, users can't access other households

### Per-Table Policies

| Table          | SELECT      | INSERT      | UPDATE      | DELETE      |
| -------------- | ----------- | ----------- | ----------- | ----------- |
| households     | Member only | Anyone      | Member only | —           |
| profiles       | Own only    | Own only    | Own only    | —           |
| transactions   | Member only | Member only | Member only | Member only |
| month_status   | Member only | Member only | Member only | —           |
| import_batches | Member only | Member only | —           | Member only |
| budget_config  | Member only | Member only | Member only | —           |

### Authentication

**Magic Link (OTP) Flow:**

1. User enters email
2. Supabase sends magic link
3. User clicks link → session created
4. Session stored in browser

**Why magic link:** No passwords to leak, email verification built-in, simpler attack surface.

**Sessions:** Expire after 1 week, refresh tokens allow seamless re-auth.

### Household Isolation

1. User creates household → gets unique `join_code` (12 hex chars, ~281 trillion possible)
2. Partner joins with code → both become `household_members`
3. All queries filter by `household_id`
4. RLS enforces at database level

---

## 4. Environment Variables

### Safe to Expose (browser)

| Variable                        | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project URL (e.g., `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS protects data)           |

### Never Expose

| Variable                    | Risk if Exposed                                       |
| --------------------------- | ----------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses all RLS — attackers can read/modify ALL data |

If service role key is compromised: See OPS_PRIVATE.md for rotation procedure.

---

## 5. Deployment Checklist

### Before Deploying to Vercel

- [ ] Fresh Supabase project (not reused)
- [ ] `schema.sql` run to set up RLS
- [ ] `.env.local` is in `.gitignore`
- [ ] Secrets never committed to git
- [ ] Environment variables set in Vercel

### Supabase Auth URLs

**Development:**

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/**`

**Production:**

- Site URL: `https://<your-app>.vercel.app`
- Redirect URLs: `https://<your-app>.vercel.app/**`

---

## 6. Threat Model

### Protected Against

| Threat                   | Mitigation                     |
| ------------------------ | ------------------------------ |
| Unauthorized data access | RLS household isolation        |
| Session hijacking        | Supabase session management    |
| SQL injection            | Parameterized queries          |
| XSS                      | React escapes output           |
| CSRF                     | SameSite cookies + auth tokens |

### Accepted Risks

- Email as identity (trust email providers)
- Supabase as backend (trust their security)
- Vercel as host (trust their infrastructure)

### Known Gaps (Acceptable for v1)

- No rate limiting (rely on Supabase defaults)
- No two-factor auth (magic link sufficient)
- No detailed audit logging

---

## 7. Incident Response

### If Keys are Leaked

See OPS_PRIVATE.md for specific rotation steps.

General process:

1. Rotate compromised key in Supabase Dashboard
2. Update environment variables in Vercel
3. Redeploy
4. Check `auth.users` and `errors` tables for suspicious activity

### If Account is Compromised

1. User requests magic link to regain access
2. Check recent transactions for unauthorized changes
3. Consider regenerating household `join_code`

---

## 8. Data Privacy

### What We Store

- Email addresses (for auth)
- Transaction data (amounts, descriptions, dates, categories)
- Household names
- Discussion notes

### What We Don't Store

- Passwords
- Bank account numbers
- Credit card numbers
- Government IDs

---

## 9. Resource Limits (Supabase Free Tier)

| Resource     | Limit      |
| ------------ | ---------- |
| Database     | 500 MB     |
| Auth Users   | Unlimited  |
| File Storage | 1 GB       |
| Bandwidth    | 5 GB/month |

Sufficient for two-person household budget app.

---

## 10. Emergency Contacts

- **Supabase Support:** Dashboard > Help > Contact Support
- **Supabase Status:** [status.supabase.com](https://status.supabase.com)
- **Vercel Status:** [vercel-status.com](https://vercel-status.com)
