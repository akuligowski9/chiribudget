# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChiriBudget is a mobile-friendly PWA for shared household budgeting between two people. It uses Next.js 16 (App Router), React 18, and Supabase (PostgreSQL + Auth).

## Development Commands

```bash
npm run dev           # Start development server on localhost:3000
npm run build         # Production build
npm run start         # Run production build
npm run lint          # Run ESLint
npm run format        # Format all files with Prettier
npm run format:check  # Check formatting without writing
npm test              # Run Jest tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Architecture

### Two Main Routes

- **`/`** (Home) - Transaction entry via QuickAddForm, JSON import, CSV export
- **`/dashboard`** - Analytics, flagged transaction review, monthly discussion notes

### Directory Structure

- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - Client-side React components (`"use client"`)
- `src/lib/` - Business logic, Supabase client, utilities
- `supabase/` - PostgreSQL schema with Row-Level Security (RLS)
- `demo/` - Sample data for demo mode

### Key Files

- `src/lib/supabaseClient.js` - Supabase JS client (client-side only)
- `src/lib/categories.js` - Budget enums: currencies (USD/PEN), categories, thresholds ($500/1625 PEN)
- `src/lib/demoStore.js` - In-memory storage for demo mode
- `supabase/schema.sql` - Complete database schema with RLS policies and triggers

### Import Alias

Uses `@/*` for `src/*` imports (configured in `jsconfig.json`).

## Database Design

Tables: `households`, `household_members`, `profiles`, `transactions`, `month_status`, `import_batches`, `budget_config`, `errors`

Key patterns:

- RLS enforces household isolation (only members can access data)
- Fingerprinting prevents duplicate imports (hash-based deduplication)
- Auto-flagging: transactions over threshold marked as "Unexpected"/"Extra"

## Demo Mode

When `localStorage` has demo flag set, the app uses `demo/transactions.json` instead of Supabase. Demo mode allows testing without a real database connection.

## Budget Rules

- **Currencies**: USD, PEN (Peruvian Sol) with FX rate 3.25
- **Thresholds**: $500 USD / 1625 PEN for auto-flagging
- **Payers**: alex, adriana, together
- **Categories**: Fixed Expenses, Rent/Mortgages, Food, Dogs, Holidays, Adventure, Unexpected, Salary, Investments, Extra
