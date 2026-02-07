# ChiriBudget

**A shared household budgeting app built for two-person households.**

ChiriBudget is a mobile-friendly web app (installable as a PWA) that makes monthly budgeting collaborative. It supports quick transaction entry, bank CSV import with duplicate detection, recurring transactions, category spending limits, period-over-period comparison, and a monthly dashboard for discussion and accountability.

Built with Next.js, Supabase, and deployed on Vercel.

---

## Live Demo

Try ChiriBudget without signing up: **[Try Demo](https://chiribudgetdemo.vercel.app)**

Explore with sample data — no account required. The demo uses in-memory storage, so nothing is saved.

---

## Features

- **Quick Add** — Log transactions in seconds from your phone
- **Bank CSV Import** — Import statements from PNC Bank (credit + checking) and Interbank (Peru). Auto-detects format, flags in-file duplicates for review, skips already-imported transactions
- **Recurring Transactions** — Auto-populate monthly bills, rent, and subscriptions
- **Auto-Flagging** — Transactions over a configurable threshold are flagged for discussion. Category spending limits add per-category budget enforcement
- **Duplicate Detection** — In-file duplicates (e.g., two identical payments on the same date) are imported and flagged as "possible duplicate" for human review, not silently dropped
- **Dashboard** — Monthly breakdown by category and payer, with period-over-period comparison (percentage changes vs previous month/quarter/year)
- **Discussion Flow** — Flagged transactions require explanation before marking a month as "discussed"
- **Multi-Currency** — USD and PEN with configurable exchange rate
- **Bilingual** — English and Spanish (toggle in Settings)
- **Offline Support** — Log transactions offline via IndexedDB; syncs when connectivity returns
- **PWA Installable** — Add to home screen on iOS/Android for native-like experience
- **CSV Export** — Export transactions by month and currency

---

## Budget Rules & Guidelines

- Track income and expenses by person (dynamic from household members) or "Together"
- Expense categories: Fixed Expenses, Rent/Mortgages, Food, Dogs, Holidays & Birthdays, Adventure, Unexpected
- Income categories: Salary, Investments, Extra
- Any transaction over the configured threshold is **flagged** for review:
  - Expense over threshold → categorized as **Unexpected**
  - Income over threshold → categorized as **Extra**
- Per-category spending limits can be set with configurable auto-flagging behavior
- Update each month by the end of the month — discuss together at least once after updates

---

---

## App Structure

### Home (Transaction Entry)

- **Quick Add** — Date, amount, currency, category, payer, description
- **Import** — CSV from bank statements or paste JSON
- **Export** — CSV download by month and currency

### Review (Unsorted Transactions)

- Imported transactions grouped by batch (bank + date range)
- Categorize, assign payer, flag duplicates
- Three-state filter: All / Sorted / Unsorted
- Collapsible batch sections with history toggle

### Dashboard (Monthly Review)

- Month selector + currency toggle
- Category breakdown with spending charts
- Period-over-period comparison (vs previous month/quarter/year)
- Category spending limit progress bars
- Net by payer
- Flagged transactions with explanations
- Discussion notes and "Mark Discussed" flow

---

## Tech Stack

- **Next.js 16 (App Router)** — React 18, JavaScript
- **Supabase** — OAuth (Google + GitHub) + PostgreSQL + Row-Level Security (RLS)
- **Vercel** — Hosting with GitHub Actions CI/CD
- **PWA** — Service worker + IndexedDB for offline support
- **Testing** — Jest (272+ unit/component tests) + Playwright (E2E)
- **i18n** — next-intl (English + Spanish)

---

## Setup (Fork-Friendly)

### 1) Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click **New Project**
3. Choose a name (e.g., "chiribudget")
4. Set a strong database password (save it somewhere safe!)
5. Choose a region close to you
6. Click **Create new project** (takes ~2 minutes)

### 2) Run the Database Migrations

The database schema is managed via sequential migration files in `supabase/migrations/`.

**Option A: Supabase CLI (recommended)**

```bash
npm install -g supabase
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase db push
```

**Option B: Manual SQL**

1. In your Supabase dashboard, go to **SQL Editor**
2. Run each migration file in order: `001_base_schema.sql`, `002_category_limits.sql`, `003_recurring_transactions.sql`, `004_fix_households_insert_policy.sql`, `005_import_duplicate_flags.sql`

After running, you'll have:

- 10 tables: households, household_members, profiles, budget_config, transactions, month_status, import_batches, errors, recurring_transactions, recurring_exceptions
- RLS policies for secure multi-tenant access
- Helper functions for budget rules and auto-flagging
- Performance indexes and unique constraints

### 3) Enable OAuth Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Google**: Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/), add Client ID and Secret
3. Enable **GitHub**: Create an OAuth App in [GitHub Developer Settings](https://github.com/settings/developers), add Client ID and Secret
4. In **Authentication** → **URL Configuration**, add your redirect URLs:
   - `https://your-domain.vercel.app/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)

### 4) Get Your API Keys

1. Go to **Settings** → **API** (left sidebar)
2. Copy these two values:
   - **Project URL** (e.g., `https://abc123.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 5) Configure Environment Variables

Create `.env.local` in your project root:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Note:** The anon key is safe to expose client-side because RLS policies protect all data.

For production (Vercel), add these same variables in your project's Environment Variables settings.

### 6) Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7) Create Your Household

1. Click **Sign Up** and create an account
2. After signing in, create a new household
3. Share the **Join Code** with your partner so they can join
4. Start adding transactions!

---

## Deployment (Vercel)

### Quick Start

1. Push your code to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

### GitHub Actions CI/CD

This project includes four GitHub Actions workflows:

**CI** (`.github/workflows/ci.yml`) — Runs on every push and PR. Checks formatting, linting, tests, and build.

**Deploy** (`.github/workflows/deploy.yml`) — Manual trigger (`workflow_dispatch`). Pipeline: CI → Backup → Database Migrations → Vercel Deploy. Migrations run automatically via `supabase db push` before each deploy.

**Backup** (`.github/workflows/backup.yml`) — Runs every 3 days + before each deploy. Exports all data to a private backup repository.

**Release** (`.github/workflows/release.yml`) — Auto-bumps patch version and creates GitHub releases after deploy.

To enable automated deployments, add these secrets to your GitHub repository:

| Secret                  | Source                                                                     |
| ----------------------- | -------------------------------------------------------------------------- |
| `VERCEL_TOKEN`          | [Vercel Account Settings](https://vercel.com/account/tokens)               |
| `VERCEL_ORG_ID`         | From `vercel link` → `.vercel/project.json`                                |
| `VERCEL_PROJECT_ID`     | From `vercel link` → `.vercel/project.json`                                |
| `SUPABASE_ACCESS_TOKEN` | [Supabase Account Settings](https://supabase.com/dashboard/account/tokens) |

### Environment Variables Reference

| Variable                        | Required  | Description                                    |
| ------------------------------- | --------- | ---------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes       | Your Supabase project URL                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes       | Your Supabase anon/public key                  |
| `NEXT_PUBLIC_DEMO_ONLY`         | Demo only | Set to `true` for demo-only deployment         |
| `VERCEL_TOKEN`                  | For CI/CD | Vercel API token (GitHub secret)               |
| `SUPABASE_ACCESS_TOKEN`         | For CI/CD | Supabase access token for automated migrations |

---

## Troubleshooting

### Common Issues

**"Invalid API key" or auth errors**

- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Verify the anon key hasn't been regenerated in Supabase dashboard

**OAuth login fails ("redirect_uri_mismatch")**

- Verify redirect URIs are configured in both Supabase Dashboard (Authentication → URL Configuration) and the OAuth provider (Google Cloud Console / GitHub Developer Settings)
- The callback URL must match exactly: `https://YOUR_SUPABASE_PROJECT.supabase.co/auth/v1/callback`

**"Row Level Security" errors**

- Ensure you ran all migration files in `supabase/migrations/` in order
- Check that the user is a member of the household they're trying to access

**Build fails on Vercel**

- Verify all environment variables are set in Vercel project settings
- Check the build logs for specific error messages

**Tests fail locally**

- Run `npm install` to ensure dependencies are up to date
- Check that Node.js version is 18+ (20 recommended)

### Resetting the Database

If you need to start fresh:

1. In Supabase SQL Editor, run:

   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   ```

2. Re-run all migrations in `supabase/migrations/` in order (or use `supabase db push`)

**Warning:** This deletes all data permanently.

---

## Contributing

Contributions are welcome.

**Report bugs:** Open an issue with steps to reproduce.

**Suggest features:** Open an issue describing the use case. Check [BACKLOG.md](./docs/BACKLOG.md) first to see what's already planned.

**Submit PRs:**

1. Fork the repository
2. Create a branch (`feature/description` or `fix/description`)
3. Make your changes
4. Run tests (`npm test`) and lint (`npm run lint`)
5. Commit with a concise, imperative message (e.g., "Add export button to dashboard")
6. Open a pull request

**Code style:** Run `npm run lint` before submitting. Follow existing patterns.

**Testing:** Run `npm test` before submitting. Add tests for new features.

---

## Documentation

- [BACKLOG.md](./docs/BACKLOG.md) — Task tracking and priorities
- [PROGRESS.md](./docs/PROGRESS.md) — Session-by-session development log
- [TECH_SPEC.md](./docs/TECH_SPEC.md) — Technical specification and architecture
- [OPS.md](./docs/OPS.md) — Operations runbook (backup, recovery, deployment)
- [INSTRUCTIONS.md](./docs/INSTRUCTIONS.md) — AI collaboration guidelines
