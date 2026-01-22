# ChiriBudget Progress Log

This document tracks where work left off, decisions made, and what's next. Read this after `INSTRUCTIONS.md` when starting a new session.

---

## 2026-01-22 — Offline Translation Keys & Settings Tabs

### Summary

Added translation keys for all offline-related UI strings and reorganized Settings page with tabbed interface.

### Work Completed

**Offline Translation Keys**

Added English and Spanish translations for offline functionality:

- `messages/en.json` and `messages/es.json` updated
- New `offline` section with 12 keys: `offlineMode`, `syncing`, `syncFailed`, `pendingSingular`, `pendingPlural`, `syncNow`, `willSyncSingular`, `willSyncPlural`, `syncConflict`, `conflictDescription`, `currentValue`, `acceptServer`
- Added to `common` section: `dismiss`, `savedOffline`, `willSyncWhenOnline`

**Settings Page Reorganization (CB-047)**

- Reorganized Settings from 9 vertical cards to 4 category tabs
- Account tab: Profile, Language
- Household tab: Members, Guidelines
- Budget tab: Conversion Rate, Thresholds, Category Limits
- Data tab: Backup, Trash
- Reduces scrolling and groups related settings logically

### What's Next

- Consider unit tests for offlineStore.js and syncQueue.js
- Manual testing of offline flow and sync behavior
- Bank-specific CSV parsing (waiting on examples)
- Test restore backup feature (reminder in BACKLOG.md)

---

## 2026-01-21 — Automated Backup System & Restore Feature

### Summary

Implemented automated backup system (CB-046) with GitHub Actions workflow that backs up all Supabase data to a private repository every 3 days. Added manual backup download and restore features to the Settings UI.

### Work Completed

**Automated Backup Workflow (CB-046)**

- `.github/workflows/backup.yml` — Runs every 3 days, exports all tables to JSON
- Backs up to private `chiribudget-backups` repository
- Pre-deploy backup trigger ensures backup before each deployment
- Failure notification creates GitHub issue with `backup-failure` label

**Manual Backup & Restore**

- `src/components/BackupSettings.jsx` — Download and restore UI
- `scripts/restore-backup.js` — CLI restore script with dry-run support
- Download button shows row counts for verification
- Restore validates file format and filters to current household
- Confirmation dialog before restore with backup details
- Added `setDemoTransactions` to demoStore for demo mode restore

**Translations**

- Full English and Spanish translations for backup UI
- Keys: `backup.title`, `downloadButton`, `restoreButton`, `confirmRestoreTitle`, etc.

### Decisions Made

- **3-day backup frequency**: Balance between data safety and storage/API usage
- **Private repo for backups**: Financial data stays separate from public codebase
- **Household filtering on restore**: Prevents accidental cross-household data restoration
- **GitHub issue on failure**: Email notification via GitHub's built-in alerts

---

## 2026-01-21 — Category Spending Limits (CB-036)

### Summary

Added per-category spending limits with configurable auto-flagging behavior. Users can set monthly USD limits for expense categories and choose how transactions are flagged when limits are approached or exceeded.

### Work Completed

**Database Changes**

- Added `category_limits` JSONB column to `budget_config` table
- Stores limit amount and flag mode per category

**New Components**

- `src/components/CategoryLimitsSettings.jsx` — Settings UI for configuring limits
- Dashboard shows color-coded progress bars (green 0-79%, yellow 80-99%, red 100%+)

**Flag Modes**

- **Off**: Dashboard warnings only, no auto-flagging
- **Flag crossing**: Only flag the transaction that crosses the limit
- **Flag all after**: Flag all transactions after limit is reached

**Translations**

- Full English and Spanish support for category limits UI

### Decisions Made

- **USD-only limits**: Simplifies UX; PEN amounts converted using household FX rate
- **Three flag modes**: Balances strictness with flexibility for different spending styles

---

## 2026-01-21 — Component Refactoring

### Summary

Major refactoring session to break down large components into smaller, focused modules. Improves maintainability and testability.

### Work Completed

**ImportPanel Refactor (CB-019)**

Split `ImportPanel.js` (426 lines) into:

- `ImportJsonInput.jsx` (63 lines) — Currency selector and JSON textarea
- `ImportPreview.jsx` (148 lines) — Preview stats and transaction table
- `importUtils.js` (49 lines) — Fingerprinting and normalization helpers

**ImportUpload Refactor**

Split `ImportUpload.jsx` (690 → 416 lines, 40% reduction) into:

- `ImportFileDropzone.jsx` (66 lines) — File drop zone with drag/drop
- `ImportOptionsForm.jsx` (94 lines) — Bank, year, payer selectors
- `ImportResults.jsx` (70 lines) — Results and unparseable rows display
- `csvParserUtils.js` (125 lines) — Bank mappings and parsing helpers

**TransactionList Refactor**

Split `TransactionList.jsx` (772 → 412 lines) into:

- `TransactionCard.jsx` — Individual transaction with inline editing
- `TransactionSearchSort.jsx` — Search input and sort controls
- `TransactionSummaryBar.jsx` — Count and totals display
- `TransactionPagination.jsx` — Pagination controls
- `transactionUtils.js` — Shared utility functions

**Lint Fixes**

- Reordered useCallback definitions before dependent useEffects in OfflineContext.js
- Prefixed unused variables with underscores in syncQueue.js and test files

### Decisions Made

- **Single responsibility**: Each component handles one concern
- **Utilities extracted**: Reusable logic moved to separate files
- **Consistent naming**: All extracted components follow `[Parent][Purpose].jsx` pattern

---

## 2026-01-20 — Offline Support Implementation

### Summary

Implemented full offline support (CB-039 through CB-043) so users can log transactions without internet and sync when connectivity returns. This addresses the primary use case of entering expenses immediately after a purchase when there's no internet.

### Work Completed

**New Files Created**

- `src/lib/offlineStore.js` — IndexedDB operations mirroring demoStore API pattern
- `src/lib/syncQueue.js` — Queue management with retry backoff and conflict resolution
- `src/hooks/useNetworkStatus.js` — Online/offline detection hook
- `src/contexts/OfflineContext.js` — React context for offline state and operations
- `public/sw.js` — Service worker with caching strategies
- `src/components/ServiceWorkerRegistration.jsx` — Service worker registration component
- `src/components/NetworkStatus.jsx` — Offline banner and sync status indicator
- `src/components/SyncConflictModal.jsx` — Modal for displaying sync conflict details

**Modified Files**

- `src/components/Providers.jsx` — Added OfflineProvider to provider hierarchy
- `src/components/QuickAddForm.jsx` — Added offline write path with "Saved offline" feedback
- `src/components/TransactionList.jsx` — Merged offline transactions, pending indicator
- `src/components/TodayTransactions.jsx` — Included offline transactions for today
- `src/app/layout.js` — Added ServiceWorkerRegistration and NetworkStatus
- `jest.setup.js` — Added OfflineContext mock for tests

**Testing**

- Fixed test failures from new useOffline hook dependency
- Added default values for `payerOptions` in components using useAuth
- Updated test mocks in TransactionList.test.js, TransactionUpdate.test.js, DashboardSummary.test.js
- All 162 tests passing, build succeeds

### Decisions Made

- **IndexedDB via `idb` library** (1.3KB): Clean Promise-based wrapper, better than raw IndexedDB
- **Server-wins conflict resolution**: Simple and safe for 2-person household where conflicts are rare
- **Retry backoff**: Immediate → 5s → 30s → 5min → 15min (max 10 attempts)
- **Sync triggers**: Online event, visibility change, manual button, periodic (5 min)
- **Offline store mirrors demoStore pattern**: Consistent API for offline operations

### What's Next

- ~~Add translation keys for offline-related strings~~ ✓ Done 2026-01-22
- Consider unit tests for offlineStore.js and syncQueue.js
- Manual testing of offline flow and sync behavior
- Bank-specific CSV parsing (waiting on examples)

---

## 2026-01-19 — Unified Item Format for Backlog & GitHub Issues

### Summary

Established a single consistent format for all backlog items and GitHub issues. Every item now has Description, Acceptance Criteria, and Metadata sections.

### Work Completed

- Created unified item format with Description, Acceptance Criteria (checkboxes), and Metadata
- Converted all 37 backlog items to new format (Low, Parking Lot, Documented Gaps, Done)
- Updated GitHub issues #1-4 to match backlog format
- Added Archived status for abandoned/superseded tasks
- Added Type field (Feature, Bug, Maintenance) to metadata
- Updated Status Flow to include Archived

### Decisions Made

- **One format everywhere**: Same structure in BACKLOG.md and GitHub Issues for consistency
- **Acceptance Criteria required**: Even Done items have checkboxes (marked complete)
- **Documented Gaps use N/A**: Acceptance Criteria shows "N/A — Documented gap, not implementing"

### What's Next

- Apply INSTRUCTIONS.md template to other projects
- Bank-specific CSV parsing (waiting on examples)

---

## 2026-01-19 — INSTRUCTIONS.md Template Finalization

### Summary

Extended session finalizing INSTRUCTIONS.md as a reusable template for AI collaboration across projects. Added backlog enhancements, contributing guidelines, and refined status system.

### Work Completed

**Template Optimization**

- Trimmed Purpose section (6 goals → 3)
- Condensed OPS intro and "What Does NOT Belong" sections
- Simplified GitHub Issues section
- Changed documentation sync interval from 60min to 90min
- Removed ROADMAP.md as required doc (roadmap gleaned from BACKLOG/PROGRESS)
- Deleted `docs/ROADMAP.md`
- Added testing guidance to TECH_SPEC requirements

**Backlog Enhancements**

- Added optional "Documented Gaps" section for known Won't Fix limitations
- Added optional Version field (v1, v2, Unassigned) for release planning
- Added Archived status for abandoned/superseded tasks
- Fixed CB-023 note (BACKUP.md → OPS.md)

**Contributing Guidelines**

- Added Contributing section standard to INSTRUCTIONS.md
- Updated ChiriBudget README with full contributing guide

### Decisions Made

- **ROADMAP.md removed**: Now/Next/Later derivable from BACKLOG priorities and PROGRESS logs
- **90-minute sync**: Gives heads-up midway through a 3-hour session
- **Version as field, not section**: Simplest approach, keeps priority organization intact
- **Archived vs Documented Gaps**: Archived = planned then abandoned; Documented Gaps = known limitations by design
- **Template for functional apps**: Not weekend scripts; appropriate overhead for real applications

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
