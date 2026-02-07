# ChiriBudget Operations Runbook

Operational procedures for backup, recovery, security, and deployment.

For sensitive details (keys, internal URLs), see `OPS_PRIVATE.md` (gitignored).

---

## 1. Backup

### Automated GitHub Actions Backup (Primary)

A GitHub Actions workflow automatically backs up all data every 3 days to a private repository (`chiribudget-backups`).

**What's backed up:**

- All transactions (including explanations, flag reasons, flag sources)
- Budget config and category limits
- Household members
- Month status and discussion notes
- User profiles
- Recurring transactions and exceptions

**Workflow:** `.github/workflows/backup.yml`

**Schedule:** Every 3 days + before each deployment

**Failure handling:** Creates GitHub issue with `backup-failure` label, triggering email notification.

**Accessing backups:**

1. Go to private `chiribudget-backups` repository
2. Each backup is a timestamped JSON file
3. Git history provides version control for all backups

### In-App Backup Download

Users can download a full backup from **Settings > Data > Download Backup**.

- Downloads JSON file with all household data
- Shows row counts for verification
- Works in both demo and authenticated modes

### Automatic Backups (Supabase)

| Plan | Frequency             | Retention |
| ---- | --------------------- | --------- |
| Free | Daily                 | 7 days    |
| Pro  | Daily                 | 7 days    |
| Team | Daily + Point-in-time | 7 days    |

Backups run daily at ~00:00 UTC. Each backup is a full database snapshot including tables, functions, and RLS policies.

**Free tier note:** Restoration requires contacting Supabase support.

### Accessing Supabase Backups

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

### Backup Best Practices

- **Automated:** GitHub Actions runs every 3 days (no action needed)
- **Before migrations:** Download backup via Settings first
- **Monthly:** Verify backup workflow is running in GitHub Actions tab

---

## 2. Recovery

### Restore from In-App Backup (Recommended)

1. Go to **Settings > Data > Restore Backup**
2. Upload JSON backup file (from Download Backup or GitHub backup repo)
3. Review backup details in confirmation dialog
4. Confirm restore

**Notes:**

- Restores only data belonging to current household
- Existing records with matching IDs are overwritten
- Safe to use — won't affect other households

### Restore via CLI Script

For advanced restore scenarios:

```bash
# Dry run first
node scripts/restore-backup.js backup.json --dry-run

# Actual restore (requires SUPABASE_URL and SUPABASE_SERVICE_KEY)
node scripts/restore-backup.js backup.json
```

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

**OAuth Flow (Google + GitHub):**

1. User clicks "Sign in with Google" or "Sign in with GitHub"
2. Redirected to provider's OAuth consent screen
3. Provider redirects back to Supabase callback URL with authorization code
4. Supabase exchanges code for session (PKCE flow)
5. App's `/auth/callback` route completes the session exchange
6. Session stored in browser

**Why OAuth:** No passwords to leak, leverages trusted identity providers, familiar UX.

**Sessions:** Expire after 1 week, refresh tokens allow seamless re-auth.

**Timeout handling:** If OAuth redirect doesn't complete within 15 seconds, the login screen shows an error with a "Try Again" button (CB-056).

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

## 5. Environment Architecture

ChiriBudget uses three separate environments:

| Environment    | URL                          | Supabase Project         | Purpose             |
| -------------- | ---------------------------- | ------------------------ | ------------------- |
| **Production** | `chiribudget.vercel.app`     | `chiribudget-prod`       | Real user data      |
| **Demo**       | `chiribudgetdemo.vercel.app` | None (in-memory)         | Portfolio showcase  |
| **Local Dev**  | `localhost:3000`             | `chiribudget` (original) | Development/testing |

### Key Differences

- **Production**: Fresh database, OAuth enabled, real household data
- **Demo**: No database connection, uses in-memory demoStore, anyone can try it
- **Local Dev**: Uses original Supabase project with test data, for development

### Hostname Detection

The app detects which environment it's running in via `src/lib/siteConfig.js`:

- `chiribudget.vercel.app` → production
- `chiribudgetdemo.vercel.app` → demo
- `localhost` → local

This determines which OAuth buttons and navigation options appear on the login screen.

---

## 6. Deployment Checklist

### Before Deploying to Vercel

- [ ] Fresh Supabase project for production (separate from dev)
- [ ] Database migrations run (`supabase db push` or run files in `supabase/migrations/` manually)
- [ ] `.env.local` is in `.gitignore`
- [ ] Secrets never committed to git
- [ ] Environment variables set in Vercel (per environment)
- [ ] `SUPABASE_ACCESS_TOKEN` secret added to GitHub (for automated migrations in deploy workflow)
- [ ] OAuth providers configured in Supabase Dashboard (Google + GitHub)

### Supabase Auth URLs (Production Database)

Configure in Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**

- `https://chiribudget.vercel.app`

**Redirect URLs:**

- `https://chiribudget.vercel.app/auth/callback`

### Supabase Auth URLs (Local Dev Database)

**Site URL:**

- `http://localhost:3000`

**Redirect URLs:**

- `http://localhost:3000/auth/callback`

### OAuth Provider Setup

Both Google and GitHub OAuth must be configured in Supabase Dashboard → Authentication → Providers:

1. **Google OAuth**: Create credentials in Google Cloud Console, add Client ID and Secret
2. **GitHub OAuth**: Create OAuth App in GitHub Developer Settings, add Client ID and Secret

---

## 7. Threat Model

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

## 8. Incident Response

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

## 9. Data Privacy

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

## 10. Resource Limits (Supabase Free Tier)

| Resource     | Limit      |
| ------------ | ---------- |
| Database     | 500 MB     |
| Auth Users   | Unlimited  |
| File Storage | 1 GB       |
| Bandwidth    | 5 GB/month |

Sufficient for two-person household budget app.

---

## 11. Emergency Contacts

- **Supabase Support:** Dashboard > Help > Contact Support
- **Supabase Status:** [status.supabase.com](https://status.supabase.com)
- **Vercel Status:** [vercel-status.com](https://vercel-status.com)
