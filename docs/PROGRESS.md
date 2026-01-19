# ChiriBudget Progress Log

This document tracks where work left off, decisions made, and what's next. Read this after `INSTRUCTIONS.md` when starting a new session.

---

## 2026-01-19 — Dynamic Payers & Import Batch Improvements

### Summary

Major refactoring session focused on making payer options dynamic (from household members rather than hardcoded enum) and improving the import workflow with batch grouping and history views.

### Work Completed

**Dynamic Payer Options**

- Changed `transactions.payer` from enum to text type
- Updated `AuthContext.js` to load household members with display names
- Computed `payerOptions` dynamically: member names + "Together" (only if 2+ members)
- Updated all components using payer dropdowns:
  - `QuickAddForm.jsx`
  - `ImportUpload.jsx`
  - `UnsortedTransactions.jsx`
  - `TransactionList.jsx`
  - `DashboardSummary.jsx`

**Import Batch Improvements**

- `ImportUpload.jsx` now creates `import_batches` records with metadata:
  - `display_name`, `source_bank`, `default_payer`, `txn_year`
  - `date_range_start`, `date_range_end`
- Batches show as separate sections in Review page

**History Toggle**

- Added `showHistory` state to `UnsortedTransactions.jsx`
- Toggle button shows/hides confirmed batches
- Default view shows only pending batches

**Database Migrations**

- Ran migration to change `payer` from enum to text
- Added missing columns to `import_batches` table
- Dropped unused `payer_t` enum

**Demo Mode Sync Fixes**

- Fixed `QuickAddForm` to call `addDemoTransaction()` when adding
- Fixed `FlaggedReview` to call `updateDemoTransaction()` when saving
- Fixed `TodayTransactions` to call `updateDemoTransaction()` when toggling flags

### Decisions Made

- **Payer flexibility**: Payers are now arbitrary text from household member display names, not a fixed enum. "Together" only appears when 2+ members exist.
- **Batch visibility**: Confirmed batches hidden by default, viewable via History toggle.

### What's Next

- Bank-specific CSV parsing (user will provide examples)
- Continue with any remaining items from the plan file (Terminal B tasks)

---

## 2026-01-18 — v1 Completion Push

### Summary

Final push to complete all High and Medium priority items for v1 launch. Focus on security, accessibility, and polish.

### Work Completed

- CB-001: Dead code removal
- CB-002: Multi-user integration tests
- CB-003: Security headers (CSP, X-Frame-Options, etc.)
- CB-004: Production verification
- CB-005: ARIA accessibility labels
- CB-006: Remove unused UI exports
- CB-007: Focus indicators for keyboard navigation
- CB-017: Improve "Mark Discussed" UX
- CB-018: Mobile responsiveness (320px support)
- CB-020: Audit columns (created_by, updated_by, updated_at)
- CB-021: Removed unused `rejected` enum
- CB-022: Auto-deploy GitHub Actions workflow
- CB-024: Constants file for magic numbers
- CB-026: Deployment documentation
- CB-029: Spanish language support (next-intl)

### Decisions Made

- **Spanish as option**: Both English and Spanish supported, language toggle in Settings
- **Rejected enum removed**: Never used, no planned rejection workflow
- **Focus indicators**: Using `focus-visible:` for keyboard-only visibility

---

## Earlier Work (Pre-January 2026)

### Core Features Implemented

- Magic link authentication via Supabase
- Household creation and join flow
- Quick transaction entry with auto-flagging
- JSON import with duplicate detection
- CSV export by month/currency
- Dashboard with category breakdown and payer totals
- Flagged transaction review with explanations
- Monthly discussion notes and "Mark Discussed" flow
- Demo mode for portfolio showcase

### Infrastructure

- Row-Level Security (RLS) for household isolation
- PWA manifest and icons (installable, no offline)
- Jest test suite (130+ tests)
- Playwright E2E tests (20 tests)
- ESLint + Prettier + lint-staged

---

## Session Start Checklist

When resuming work:

1. Read `INSTRUCTIONS.md` for collaboration rules
2. Read this file (`PROGRESS.md`) for context
3. Check `BACKLOG.md` for current priorities
4. Check for any plan files in `~/.claude/plans/`
5. Run `npm test` to verify baseline
