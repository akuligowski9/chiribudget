# ChiriBudget Progress Log

This document tracks where work left off, decisions made, and what's next. Read this after `INSTRUCTIONS.md` when starting a new session.

---

## 2026-01-19 — INSTRUCTIONS.md Template Optimization

### Summary

Refined INSTRUCTIONS.md to reduce token overhead while preserving utility as a reusable template for future projects.

### Work Completed

- Trimmed Purpose section (6 goals → 3)
- Condensed OPS intro and "What Does NOT Belong" sections
- Simplified GitHub Issues section
- Changed documentation sync interval from 60min to 90min
- Removed ROADMAP.md as required doc (roadmap gleaned from BACKLOG/PROGRESS)
- Deleted `docs/ROADMAP.md`
- Added testing guidance to TECH_SPEC requirements

### Decisions Made

- **ROADMAP.md removed**: Now/Next/Later info derivable from BACKLOG priorities and PROGRESS session logs
- **90-minute sync**: Better balance — gives heads-up midway through a 3-hour session
- **Template is for functional apps**: Not intended for weekend scripts; appropriate overhead for real applications with ongoing AI collaboration

### What's Next

- Apply INSTRUCTIONS.md template to other projects
- Bank-specific CSV parsing (waiting on examples)
- Terminal B tasks (ConfirmDialog, demoStore tests, etc.)

---

## 2026-01-19 — Future Features Added to Backlog

### Summary

End-of-day session to capture future feature ideas in the backlog and promote them to GitHub Issues for long-term tracking.

### Work Completed

**New Backlog Items (Low Priority)**

- CB-035: Recurring Transactions — Auto-populate monthly bills, rent, subscriptions (#1)
- CB-036: Category Budget Limits — Set spending caps per category with warnings (#2)
- CB-037: Month-over-Month Comparison — Show spending trends vs previous months (#3)
- CB-038: Shared Shopping List — Household shopping list that complements expense tracking (#4)

**GitHub Issues Created**

All 4 items promoted to GitHub Issues for async tracking. BACKLOG.md updated with issue numbers.

### Decisions Made

- **Receipt photo attachment deferred**: Considered but not added — would require significant infrastructure (storage, OCR) for minimal benefit in a 2-person household app
- **All new items Low priority**: These are enhancements, not blockers for v1

### What's Next

- Bank-specific CSV parsing (waiting on examples)
- Terminal B tasks from plan file (ConfirmDialog, demoStore tests, etc.)

---

## 2026-01-19 — Documentation Restructure & INSTRUCTIONS.md Compliance

### Summary

Major documentation overhaul to align with the new `INSTRUCTIONS.md` collaboration contract. Consolidated operational docs, restructured backlog format, and established consistent documentation standards.

### Work Completed

**Documentation Structure**

- Created `docs/INSTRUCTIONS.md` — AI collaboration contract with authoritative rules
- Created `docs/PROGRESS.md` — Session continuity log
- Created `docs/ROADMAP.md` — Now/Next/Later narrative plan
- Restructured `docs/BACKLOG.md` to match required format (Status Flow, checkbox items, GitHub Issue field)
- Updated `docs/TECH_SPEC.md` with Edge Cases, Decisions, External Integrations, Open Questions/Risks

**Operational Documentation (OPS)**

- Created `docs/OPS.md` — Public-safe operational runbook (backup, recovery, security, deployment)
- Created `docs/OPS_PRIVATE.md` — Sensitive details (gitignored)
- Deleted `docs/BACKUP.md` — Merged into OPS.md
- Deleted `docs/SECURITY.md` — Split into OPS.md and OPS_PRIVATE.md
- Added OPS section to INSTRUCTIONS.md with full guidelines

**CLAUDE.md**

- Simplified `CLAUDE.md` to behavior preferences only (no project details)
- Added CLAUDE.md Responsibilities section to INSTRUCTIONS.md with required template
- Project details now live in TECH_SPEC.md, not CLAUDE.md

**README.md**

- Added Live Demo link to chiribudget.vercel.app
- Added Contributing section
- Added Documentation section with links to docs/

### Decisions Made

- **INSTRUCTIONS.md is authoritative**: CLAUDE.md preferences cannot override it
- **OPS separate from TECH_SPEC**: Operational procedures don't belong in design docs
- **OPS_PRIVATE gitignored**: Sensitive details never committed
- **Backlog format**: Checkbox items with Status, Priority, Assignee, GitHub Issue fields
- **CLAUDE.md minimal**: Only behavior preferences, defers to INSTRUCTIONS.md for rules

### What's Next

- Bank-specific CSV parsing (waiting on examples)
- Consider creating initial OPS.md content for other Alex projects using same template

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
