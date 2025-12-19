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

| Rule / Guideline | Requirement | Feature |
|---|---|---|
| Track saved/lost by person | Attribute transactions to payer | `payer` = alex/adriana/together + Dashboard net totals |
| Keep categories consistent | Fixed taxonomy | Enforced category list (enum) |
| Multi-currency (USD/PEN) | Filter views by currency | Currency toggle for import/export/dashboard |
| Transactions over threshold are special | Flag + override category | Auto-flagging + category override server-side |
| Avoid forcing notes for everything | Notes only when needed | Flagged items appear on Dashboard; add explanations later |
| Preserve data integrity | Import verification before write | Paste JSON → preview totals → confirm → persist |
| Avoid duplicate imports | Dedupe | Fingerprint unique index per household |
| Monthly discussion ritual | Track progress | Dashboard discussion notes + Draft/Discussed + timestamp |

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

### 1) Create a Supabase project
- Enable Email authentication (Magic Link)
- Run the SQL schema from `supabase/schema.sql`

### 2) Configure environment variables
Create `.env.local` (and set the same vars in Vercel):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> Note: This app uses RLS for security, so the anon key is safe to use client-side as long as you keep policies enabled.

### 3) Install & run
```bash
npm install
npm run dev
