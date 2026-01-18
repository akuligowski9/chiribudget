# ChiriBudget

**Purpose:** Create a friendly, shared view of our family’s financial health.  
**Subtitle:** Built to make monthly budgeting easier than spreadsheets.

ChiriBudget is a small, mobile-friendly web app (installable as a PWA) designed for two-person households.  
It supports quick daily transaction entry, import preview/verification, CSV export, and a monthly dashboard for discussion and accountability.

---

## Budget Rules & Guidelines (Last Updated: December 2025)

- For all income and losses, track how much is saved / lost per month (**Alex, Adriana, Together**)
- Expense categories:
  - Fixed Expenses, Rent/Mortgages, Food, Dogs, Holidays & Birthdays, Adventure, Unexpected
- Income categories:
  - Salary, Investments, Extra
- Any transaction over the configured threshold is **flagged** for review:
  - Expense over threshold → categorized as **Unexpected**
  - Income over threshold → categorized as **Extra**
- Update each month by the end of the month — discuss together at least once after updates
- Notify each other before signing up for new recurring costs or spending over the threshold

---

## How Rules Become Requirements (and Features)

| Rule / Guideline                        | Requirement                      | Feature                                                   |
| --------------------------------------- | -------------------------------- | --------------------------------------------------------- |
| Track saved/lost by person              | Attribute transactions to payer  | `payer` = alex/adriana/together + Dashboard net totals    |
| Keep categories consistent              | Fixed taxonomy                   | Enforced category list (enum)                             |
| Multi-currency (USD/PEN)                | Filter views by currency         | Currency toggle for import/export/dashboard               |
| Transactions over threshold are special | Flag + override category         | Auto-flagging + category override server-side             |
| Avoid forcing notes for everything      | Notes only when needed           | Flagged items appear on Dashboard; add explanations later |
| Preserve data integrity                 | Import verification before write | Paste JSON → preview totals → confirm → persist           |
| Avoid duplicate imports                 | Dedupe                           | Fingerprint unique index per household                    |
| Monthly discussion ritual               | Track progress                   | Dashboard discussion notes + Draft/Discussed + timestamp  |

---

## App UX

### Home (Command Center)

Home is for action and context:

- App name + purpose
- Rules & Guidelines (collapsible)
- Transactions:
  - **Quick Add**
  - **Import** (paste JSON → preview → confirm)
  - **Export** (CSV by month + currency)

### Dashboard (Reflection + Discussion)

Dashboard is for reviewing what’s in the database:

- Month selector + currency toggle
- Totals by category + saved/lost per payer
- Flagged transactions list (add explanations later)
- Discussion notes: “What we agreed / next month focus”
- Mark month **Discussed** (blocked if flagged explanations are unresolved)

---

## Demo Mode (Portfolio Preview)

ChiriBudget supports **Demo Mode** (“Try Demo”) which uses local JSON sample data and does not require authentication.

- No real database reads/writes
- Import can parse + preview but will not persist

This is designed to make it safe to showcase publicly in a portfolio.

---

## Tech Stack

- **Next.js (App Router)** — JavaScript
- **Supabase** — Auth (magic link) + Postgres + Row Level Security (RLS)
- **Vercel** — hosting
- **PWA installable** — manifest + icons (no offline support)

---

## Setup (Fork-Friendly)

### 1) Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Click **New Project**
3. Choose a name (e.g., "chiribudget")
4. Set a strong database password (save it somewhere safe!)
5. Choose a region close to you
6. Click **Create new project** (takes ~2 minutes)

### 2) Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Copy the entire contents of `supabase/schema.sql` and paste it
4. Click **Run** — you should see "Success"

After running, you'll have:

- 8 tables: households, household_members, profiles, budget_config, transactions, month_status, import_batches, errors
- RLS policies for secure multi-tenant access
- Helper functions for budget rules
- Performance indexes

### 3) Enable Email Auth

1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled (it should be by default)
3. (Optional) For easier testing, go to **Authentication** → **Settings** and disable "Enable email confirmations"

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

### GitHub Actions CI/CD (Optional)

This project includes GitHub Actions workflows for continuous integration and deployment.

**CI Workflow** (`.github/workflows/ci.yml`):

- Runs on every push and pull request to main/master
- Checks formatting, runs linter, runs tests, and builds

**Deploy Workflow** (`.github/workflows/deploy.yml`):

- Runs after CI passes on main/master
- Requires `VERCEL_TOKEN` secret in your GitHub repository

To enable automated deployments:

1. Get your Vercel token:
   - Go to [Vercel Account Settings](https://vercel.com/account/tokens)
   - Click **Create** and name it (e.g., "github-actions")
   - Copy the token

2. Add the secret to GitHub:
   - Go to your repo → **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `VERCEL_TOKEN`
   - Value: paste your Vercel token

3. Link your Vercel project (first time only):
   ```bash
   npx vercel link
   ```

Now pushes to main will automatically deploy after tests pass.

### Environment Variables Reference

| Variable                        | Required  | Description                      |
| ------------------------------- | --------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes       | Your Supabase project URL        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes       | Your Supabase anon/public key    |
| `VERCEL_TOKEN`                  | For CI/CD | Vercel API token (GitHub secret) |

---

## Troubleshooting

### Common Issues

**"Invalid API key" or auth errors**

- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Verify the anon key hasn't been regenerated in Supabase dashboard

**Magic link not arriving**

- Check spam/junk folder
- In Supabase, go to **Authentication** → **Settings** and check email provider settings
- For development, you can disable email confirmations

**"Row Level Security" errors**

- Ensure you ran the complete `supabase/schema.sql` including RLS policies
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

2. Re-run the entire `supabase/schema.sql`

**Warning:** This deletes all data permanently.
