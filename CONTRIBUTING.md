# Contributing to ChiriBudget

Thank you for your interest in contributing.

ChiriBudget is a shared household budgeting app built for two-person households. Contributions should keep the app simple, mobile-friendly, and focused on collaborative budgeting.

---

## Code of Conduct

Be kind, respectful, and constructive. We're building something useful together — treat fellow contributors the way you'd want to be treated. Harassment, dismissive behavior, and unconstructive criticism have no place here.

---

## New to Contributing?

If this is your first open source contribution, welcome! Here's how to get started:

1. **Find an issue** — Look for issues labeled [`good first issue`](https://github.com/akuligowski9/chiribudget/labels/good%20first%20issue) for beginner-friendly tasks.
2. **Fork the repo** — Click "Fork" on GitHub, then clone your fork locally.
3. **Create a branch** — See [Branch Naming](#branch-naming) below.
4. **Make your changes** — Follow the setup instructions and run tests before submitting.
5. **Open a PR** — Push your branch and open a pull request against `main`.

If you're new to Git and GitHub, [GitHub's guide](https://docs.github.com/en/get-started/quickstart/contributing-to-projects) is a great place to start.

---

## Issue Etiquette

- **Comment before you start** — If you'd like to work on an issue, leave a comment so others know it's being tackled. This avoids duplicate effort.
- **Ask questions in the issue thread** — If you're stuck or unsure about the approach, ask! We're happy to help.
- **Don't go silent** — If you claimed an issue but can't finish it, that's totally fine. Just leave a comment so someone else can pick it up.

---

## Philosophy

- Mobile-first — most transactions are logged from a phone.
- Collaborative by default — both household members share the same data.
- Privacy-conscious — financial data stays in the user's Supabase instance.
- Keep it simple — avoid over-engineering for edge cases.

---

## Development Setup

### Prerequisites

- Node.js 18+
- Supabase CLI (for local development)
- A Supabase project (or use the local CLI)

### Quick Start

```bash
# Clone the repo
git clone https://github.com/akuligowski9/chiribudget.git
cd chiribudget

# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local  # configure Supabase credentials

# Start local Supabase (optional, for local DB)
supabase start
supabase db push

# Run the dev server
npm run dev

# Visit http://localhost:3000
```

### Running Tests

```bash
# Unit + component tests (272+)
npm test

# E2E tests
npx playwright test
```

Always run tests before submitting a PR.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Language | JavaScript (React 18) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase OAuth (Google + GitHub) |
| Hosting | Vercel |
| PWA | Service worker + IndexedDB |
| Testing | Jest (unit/component) + Playwright (E2E) |
| i18n | next-intl (English + Spanish) |

---

## Common Contribution Areas

### CSV Parsers

Bank CSV parsers live in the import pipeline. Adding support for a new bank format is a self-contained task — parse the CSV, map columns to the transaction schema, and add tests.

### i18n

The app supports English and Spanish via `next-intl`. Translation files are in `messages/`. Adding or improving translations is a great first contribution.

### UI Components

Components are in `src/components/`. The app uses shadcn/ui patterns. Keep components mobile-responsive.

---

## Branch Naming

Use a descriptive branch name with a prefix:

- `feature/shopping-list`
- `fix/csv-import-duplicates`
- `docs/update-setup`

Keep it short, lowercase, and hyphen-separated.

---

## Commit Messages

- Use the imperative mood: "Add feature" not "Added feature"
- Keep the first line under 72 characters
- Add a blank line before any extended description

---

## Pull Request Guidelines

Please ensure:

- `npm test` passes
- Code is readable without AI context
- Changes are documented if behavior changes
- UI changes maintain mobile responsiveness
- Database changes include migration files
- No secrets or API keys in committed code

Small, focused PRs are preferred.

---

## AI-Assisted Contributions

AI-assisted contributions are welcome.

Please review and understand generated code before submitting.
Maintainers may request clarification if behavior is unclear.
