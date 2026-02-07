# ChiriBudget Progress Log

This document tracks where work left off, decisions made, and what's next. Read this after `INSTRUCTIONS.md` when starting a new session.

---

## 2026-02-07 — Import Duplicate Detection Flags (CB-061) & Documentation Sync

### Summary

Implemented import duplicate detection flags so in-file duplicates are imported and flagged for review instead of silently dropped. Added `flag_source` column to transactions table to distinguish flag origins. Comprehensive documentation sync across all docs (README, BACKLOG, PROGRESS, TECH_SPEC, OPS).

### Work Completed

**CB-061: Import Duplicate Detection Flags (Done)**

**Migration (Step 1):**

- Created `supabase/migrations/005_import_duplicate_flags.sql`
- Added `flag_source text` column to transactions (nullable, no enum)
- Updated `enforce_budget_rules()` trigger to set `flag_source = 'threshold'`
- Backfilled existing threshold-flagged rows

**Import Logic (Step 2):**

- `src/lib/importUtils.js` — Added `makeUniqueFingerprint()` helper (appends `_dup2`, `_dup3`)
- `src/components/ImportFilePanel.jsx` — Replaced `fingerprintSet` (Set) with `fingerprintMap` (Map), flags both copies of duplicates, retroactively flags first occurrence, shows "X duplicates flagged for review"
- `src/components/ImportUpload.jsx` — Same pattern: flag instead of skip, updated summary and toast text

**Other Flag Paths (Step 3):**

- `src/components/QuickAddForm.jsx` — Sets `flag_source` to `'threshold'` or `'category_limit'`
- `src/components/ImportPanel.js` — Sets `flag_source: 'threshold'` for JSON import

**UI Indicators (Step 4):**

- `src/components/UnsortedTransactions.jsx` — Amber Flag icon with label ("Possible duplicate" / "Over threshold" / "Category limit")
- `src/components/FlaggedReview.jsx` — Added `flag_source` to select query, displays source context

**Documentation Sync:**

- `README.md` — Major rewrite for portfolio visitors: features section, OAuth auth, migrations setup, deploy pipeline, updated env vars, test counts
- `docs/BACKLOG.md` — Added CB-061, fixed CB-044 (PNC parser → Done), fixed CB-060 (Version → Done), cleaned up stale reminders
- `docs/PROGRESS.md` — This entry
- `docs/TECH_SPEC.md` — Fixed auth, data model (payer text, flag_source, recurring tables), non-goals, test counts, infrastructure refs
- `docs/OPS.md` — Fixed auth description, deploy checklist, backup table list

### Files Modified (Feature)

| File                                                 | Action   |
| ---------------------------------------------------- | -------- |
| `supabase/migrations/005_import_duplicate_flags.sql` | Created  |
| `src/lib/importUtils.js`                             | Modified |
| `src/components/ImportFilePanel.jsx`                 | Modified |
| `src/components/ImportUpload.jsx`                    | Modified |
| `src/components/QuickAddForm.jsx`                    | Modified |
| `src/components/ImportPanel.js`                      | Modified |
| `src/components/UnsortedTransactions.jsx`            | Modified |
| `src/components/FlaggedReview.jsx`                   | Modified |

### Files Modified (Documentation)

- `README.md`, `docs/BACKLOG.md`, `docs/PROGRESS.md`, `docs/TECH_SPEC.md`, `docs/OPS.md`

### Decisions Made

- **Flag both copies**: User needs to see both to decide which to keep/delete
- **Fingerprint suffix**: Simplest way to satisfy unique constraint without schema changes
- **Nullable text, not enum**: Avoids migration for each new flag source
- **Threshold trigger wins**: If import dupe also exceeds threshold, DB trigger overwrites to `'threshold'`
- **DB-level dupes still skipped**: Only in-file duplicates get flagged

### Test Results

- Unit tests: 272/273 passing (1 pre-existing AuthContext failure)
- Build: Passes

### What's Next

- Manual test with PNC checking CSV (the two $172.67 rows on 2026-01-20 should both import with amber flags)
- Manual test with non-duplicate CSV (no flags set, normal behavior)
- Verify threshold flags still work with `flag_source = 'threshold'`

---

## 2026-02-06 (Evening) — CB-060: Version Display & Release Process

### Summary

Created and partially implemented CB-060. The app had no visible version indicator (package.json v0.1.2 not exposed anywhere), no git tags, no GitHub releases, and no auto-increment. Completed 3 of 5 implementation steps; release workflow creation remains.

### Work Completed

**CB-060: Version Display & Release Process (In Progress — 3/5 steps done)**

**Step 1: Exposed version in `next.config.js`**

- Added `const { version } = require('./package.json')` at top
- Added `env: { NEXT_PUBLIC_APP_VERSION: version }` to config
- Standard Next.js pattern — baked at build time, no runtime config needed

**Step 2: Added translation keys**

- English (`messages/en.json`): `"appVersion": "v{version}"` in settings section
- Spanish (`messages/es.json`): `"appVersion": "v{version}"` in settings section

**Step 3: Added version display to Settings page**

- Added centered, muted `v0.1.2` text below Language Selector in Account tab
- Uses `text-xs text-warm-gray` styling to match existing muted helper text pattern
- Falls back to `0.0.0` if env var missing

### Not Completed (Carry Forward)

**Step 4: Create `.github/workflows/release.yml`**

- Auto-bump patch version via `npm version patch --no-git-tag-version`
- Commit with `[skip ci]` and push
- Create git tag and GitHub release with auto-generated notes
- Triple-layered infinite loop prevention: `[skip ci]` message, `GITHUB_TOKEN` behavior, `if` condition
- Plan file with full details: `~/.claude/plans/velvety-sleeping-tulip.md`

**Step 5: Create initial git tag**

- Run `git tag v0.1.2 && git push origin v0.1.2` to give release notes a baseline

### Files Modified

- `next.config.js` — Added `NEXT_PUBLIC_APP_VERSION` env var from package.json
- `messages/en.json` — Added `settings.appVersion` translation key
- `messages/es.json` — Added `settings.appVersion` translation key
- `src/app/settings/page.js` — Added version text display in Account tab
- `docs/BACKLOG.md` — Added CB-060, updated status to In Progress

### Decisions Made

- **Settings page over footer**: Version displayed in Settings > Account tab, not a global footer — keeps it visible but unobtrusive
- **No new component**: Single `<p>` tag, no need for a dedicated VersionDisplay component
- **Patch-level auto-increment**: Only bumps patch (0.1.x), manual bumps for minor/major
- **One-commit version lag**: Deploy and release workflows run in parallel; deployed build uses pre-bump version, next push uses bumped version. Standard and acceptable.

### What's Next

1. Create `.github/workflows/release.yml` (Step 4 of CB-060)
2. Create initial git tag `v0.1.2` (Step 5 of CB-060)
3. Run verification: `npm test` and `npm run build`
4. Mark CB-060 as Done in BACKLOG.md

---

## 2026-02-06 — Production Readiness for January Budget Discussion

### Summary

Goal: Get production app working so Alex and wife can discuss January finances tonight. Multiple blockers discovered during initial investigation.

### Critical Issues Discovered

**1. OAuth Broken in Production**

- Google OAuth: "Access blocked: redirect_uri_mismatch" (Error 400)
- GitHub OAuth: "redirect_uri is not associated with this application"
- Root cause: Redirect URIs not configured in Supabase Dashboard
- Required URIs:
  - `https://chiribudget.vercel.app` (production)
  - `https://chiribudgetdemo.vercel.app` (demo)
  - `http://localhost:3000` (local dev)

**2. Login Screen Gets Stuck**

- After OAuth fails, login shows "Redirecting to Google..." indefinitely
- No timeout or error recovery implemented
- Need to add error handling and timeout

**3. Fingerprint Deduplication Bug (Possible Year Inference Issue)**

- User reports: same income amount on different dates only appears once
- Investigation found: fingerprint DOES include date (`txn_date` field)
- Likely cause: Year inference for Interbank dates (DD-Mon format without year)
- If year not set correctly, different months could hash to same fingerprint

### Environment Architecture Clarified

| Deployment | URL                          | Purpose                | Database                    |
| ---------- | ---------------------------- | ---------------------- | --------------------------- |
| Production | `chiribudget.vercel.app`     | Real use (Alex + wife) | Supabase (chiribudget-prod) |
| Demo       | `chiribudgetdemo.vercel.app` | Portfolio showcase     | In-memory only              |
| Local      | `localhost:3000`             | Development            | Supabase (original project) |

### Banks Needed

- **PNC (USA)**: Already has parser support (credit card + checking formats)
- **Interbank (Peru)**: Already has parser support (dual-currency PEN/USD)

### New Backlog Items Created

- CB-055: Fix OAuth redirect URI configuration (Critical)
- CB-056: Fix login stuck on "Redirecting..." (High)
- CB-057: Hard delete transactions (Medium)
- CB-058: Email notifications for deleted confirmed transactions (Low - deferred)

### Decisions Made

- Hard delete preferred over soft delete for now (simpler UX)
- Email notifications deferred to backlog (nice-to-have, not tonight)
- Focus on: OAuth fix → Test imports → Ship

### Work Completed

**CB-056: Fix Login Screen Stuck on "Redirecting..." (Done)**

- Added 15-second timeout that detects failed OAuth redirects
- Shows user-friendly error message when timeout triggers
- Added "Try Again" button to reset state and allow retry
- Modified `src/components/LoginScreen.jsx`

**Bank Options Simplified**

- Reduced bank dropdown from 6 options to just PNC Bank and Interbank
- Modified `src/lib/csvParserUtils.js`

### What's Next

1. User configures OAuth redirect URIs in Supabase Dashboard (external action)
2. Test PNC and Interbank imports with real January statements
3. Debug fingerprint issue if it recurs during testing
4. Add hard delete functionality
5. Deploy and verify production works

---

## 2026-01-29 — Testing Infrastructure & Cleanup

### Summary

Added comprehensive testing infrastructure for recurring transactions. Set up integration tests with local Supabase, unit tests for recurring utilities, and fixed test isolation issues. Closed completed GitHub issues and cleaned up backlog.

### Work Completed

**Testing Infrastructure**

- Created `jest.integration.config.js` for integration tests (separate from unit tests)
- Created `scripts/seed-test-db.js` for seeding local Supabase with test fixtures
- Created `test-fixtures/seed-data.json` with synthetic test data
- Created `src/test-utils/integration-setup.js` with global test helpers
- Added `npm run test:integration` and `npm run seed:test` scripts
- Modified `npm test` to exclude integration and e2e tests by default

**Unit Tests for Recurring Utils (53 tests)**

- Created `src/lib/__tests__/recurringUtils.test.js`
- Tests for `calculateOccurrences`, `getNextOccurrence`, `generateRecurringFingerprint`
- Edge case coverage: month-end handling, leap years, biweekly alignment

**Integration Tests for Recurring Transactions (40 tests)**

- Created `src/__tests__/recurring.integration.test.js`
- CRUD operations for recurring transactions
- Exception handling (skip occurrences)
- Generated transaction fingerprinting
- Frequency validation

**DashboardSummary Test Fixes**

- Added mocks for `useDemo` and `useRecurringTransactions` hooks
- Fixed test isolation issue by changing from `toHaveBeenCalledTimes` to `toHaveBeenCalledWith`
- All 6 DashboardSummary tests now pass in full suite

**GitHub Issues Closed**

- #1 CB-035: Recurring Transactions
- #2 CB-036: Category Budget Limits
- #3 CB-037: Month-over-Month Comparison

**Backlog Cleanup**

- Removed CB-027 (TypeScript migration) from backlog

### Files Created

- `jest.integration.config.js`
- `scripts/seed-test-db.js`
- `test-fixtures/seed-data.json`
- `src/test-utils/integration-setup.js`
- `src/lib/__tests__/recurringUtils.test.js` (53 tests)
- `src/__tests__/recurring.integration.test.js` (40 tests)

### Files Modified

- `package.json` — Added test:integration, seed:test scripts; modified test to exclude integration/e2e
- `src/components/__tests__/DashboardSummary.test.js` — Added hook mocks, fixed isolation

### Test Results

- Unit tests: 272/273 passing (1 pre-existing AuthContext failure)
- Integration tests: 40/40 passing
- Build: Passes
- Lint: 0 errors (24 pre-existing warnings)

### What's Next

- Manual testing of recurring transactions end-to-end
- Test OAuth in all environments
- Test restore backup feature

---

## 2026-01-27 — Month-over-Month Comparison (CB-037)

### Summary

Implemented period-over-period spending comparison feature allowing users to see percentage changes for each category compared to the previous equivalent period. Displays inline badges next to categories and provides a collapsible comparison section with detailed table and key insights.

### Work Completed

**CB-037: Month-over-Month Comparison (Done)**

**Core Implementation:**

- Created `comparisonUtils.js` with 6 utility functions:
  - `getPreviousPeriodRange()` — Calculates previous period dates for all presets (day/week/month/quarter/year/custom)
  - `calculateCategoryDelta()` — Computes delta, percent change, and trend for a category
  - `calculateCategoryComparison()` — Compares all categories from both periods
  - `isSignificantChange()` — Determines if change warrants display (default >5%)
  - `generateInsights()` — Creates human-readable insights sorted by impact
  - `formatPreviousPeriodLabel()` — Formats date range labels for display
- Created `CategoryComparisonBadge.jsx` — Inline percentage badge with type-aware coloring:
  - Expenses: Green for decrease (good), Amber/Red for increase (bad)
  - Income: Green for increase (good), Amber/Red for decrease (bad)
  - Shows "NEW" badge for categories that didn't exist in previous period
  - Only renders for changes >5% (configurable threshold)
- Created `PeriodComparisonSection.jsx` — Collapsible comparison table:
  - Full category-by-category comparison with current/previous/delta columns
  - "Key Insights" section highlighting top 5 changes
  - Expandable/collapsible with accessible ARIA attributes
  - Mobile-responsive grid layout
- Modified `dashboard/page.js` to calculate previous period dates using `useMemo`
- Modified `DashboardSummary.jsx` to:
  - Fetch previous period data (both demo mode and production)
  - Calculate comparison metrics for all categories
  - Display badges next to income and expense categories
  - Show collapsible comparison section after charts
- Added translations for all comparison UI strings (English and Spanish)

**Testing:**

- Created `comparisonUtils.test.js` — 38 tests covering all utility functions
  - Date calculations for all presets including edge cases (month boundaries, leap years)
  - Delta calculations with new categories, zero values, decimal handling
  - Insight generation and sorting
- Created `CategoryComparisonBadge.test.js` — 18 tests for badge component
  - Rendering logic, percentage display, custom thresholds
  - Icon presence, edge cases with small/large amounts
- Created `PeriodComparisonSection.test.js` — Component integration tests
- All 56 tests passing (38 + 18 from utilities and badge component)

**Dependencies:**

- Installed `date-fns` library for robust date calculations

### Decisions Made

- **Progressive disclosure UI**: Inline badges for at-a-glance trends + collapsible detail section for power users
- **Type-aware coloring**: Different color meanings for expenses vs income (decrease=good for expenses, increase=good for income)
- **5% significance threshold**: Only show badges for changes >5% to avoid noise
- **date-fns for date math**: Handles month-end edge cases (Jan 31 → Feb 28) and leap years correctly
- **Server-side previous period calculation**: Client-side useMemo in dashboard/page.js keeps logic centralized
- **Demo mode support**: Works with both demo data and production database

### Edge Cases Handled

- **Month-end dates**: Jan 31 → Feb correctly handled using `endOfMonth()` from date-fns
- **Leap years**: Feb 29 calculations use proper date arithmetic
- **First month of usage**: No badges shown, comparison section shows "Not enough data"
- **New categories**: Display "NEW" badge instead of percentage
- **Zero spending in both periods**: No badge displayed (not significant)
- **Custom date ranges**: Calculate duration and shift backward by same period

### Files Created

- `src/lib/comparisonUtils.js` — Core comparison utilities (268 lines)
- `src/components/CategoryComparisonBadge.jsx` — Inline percentage badge (92 lines)
- `src/components/PeriodComparisonSection.jsx` — Collapsible comparison table (202 lines)
- `src/lib/__tests__/comparisonUtils.test.js` — Utility function tests (448 lines, 38 tests)
- `src/components/__tests__/CategoryComparisonBadge.test.js` — Badge component tests (264 lines, 18 tests)
- `src/components/__tests__/PeriodComparisonSection.test.js` — Comparison section tests (373 lines)

### Files Modified

- `src/app/dashboard/page.js` — Added previous period calculation
- `src/components/DashboardSummary.jsx` — Integrated comparison badges and section
- `messages/en.json` — Added English translations for comparison UI
- `messages/es.json` — Added Spanish translations for comparison UI
- `package.json` — Added date-fns dependency
- `docs/BACKLOG.md` — Marked CB-037 as Done

### What's Next

- Continue with other backlog priorities
- Consider adding comparison export feature (CSV with both periods)

---

## 2026-01-26 — Production Database Setup & Review Page Improvements

### Summary

Set up separate production Supabase database to isolate real data from development. Improved UnsortedTransactions (Review page) with collapsible batches, three-state filtering, and editable sorted transactions. Created fresh database setup script.

### Work Completed

**Production Database Setup**

- Created new Supabase project `chiribudget-prod` for production use
- Original `chiribudget` project now used only for local development
- Created `supabase/setup_fresh_db.sql` — complete schema setup script for fresh databases
- Configured OAuth providers (Google + GitHub) in production Supabase
- Updated Vercel environment variables for production deployment
- Fixed circular dependency issue in schema (profiles must be created before household_members)

**Environment Architecture:**

| Environment | URL                          | Supabase Project         | Purpose             |
| ----------- | ---------------------------- | ------------------------ | ------------------- |
| Production  | `chiribudget.vercel.app`     | `chiribudget-prod`       | Real user data      |
| Demo        | `chiribudgetdemo.vercel.app` | None (in-memory)         | Portfolio showcase  |
| Local Dev   | `localhost:3000`             | `chiribudget` (original) | Development/testing |

**UnsortedTransactions.jsx Improvements**

- Added collapsible batch sections with chevron toggle
- Replaced binary "Show All / Pending Only" toggle with three-state filter: All / Sorted / Unsorted
- Made sorted transactions editable (removed disabled state from dropdowns)
- Changed sorted transaction styling from opacity-60/disabled to green tint background

**Duplicate Detection Debugging**

- Added console.log statements in ImportFilePanel.jsx to trace fingerprint generation
- Helps diagnose issue where recurring transactions on different dates may be incorrectly marked as duplicates

### Decisions Made

- **Separate databases for prod vs dev**: Prevents test data from polluting production, allows safe experimentation
- **Demo uses no database**: In-memory demoStore, completely isolated
- **Three-state filter UX**: "All / Sorted / Unsorted" clearer than binary toggle
- **Editable sorted transactions**: Users can fix AI categorization errors on sorted items without unsorted them first

### Files Created

- `supabase/setup_fresh_db.sql` — Complete schema for fresh Supabase projects (~560 lines)

### Files Modified

- `src/components/UnsortedTransactions.jsx` — Collapse feature, three-state filter, editable sorted
- `src/components/ImportFilePanel.jsx` — Debug logging for duplicate detection

### What's Next

- Test OAuth login on production site (https://chiribudget.vercel.app)
- Debug duplicate detection issue with real PNC file
- Commit and push changes

---

## 2026-01-22 — Demo-Only Mode Fix: Eliminate Login Screen Flash

### Summary

Fixed the persistent issue where the demo-only deployment (`chiribudgetdemo.vercel.app`) showed a login screen flash before entering demo mode. The root cause was a race condition between React initialization and localStorage being set. The solution uses a pre-hydration inline script that sets localStorage BEFORE React loads, eliminating the race condition entirely.

### Work Completed

**CB-048: Separate Demo Mode Deployment (Done)**

**Core Fix:**

- Added inline `<script>` in `layout.js` `<head>` that sets `localStorage.setItem('chiribudget_demoMode', 'true')` before React hydration when `NEXT_PUBLIC_DEMO_ONLY=true`
- Removed `window.location.reload()` calls from `enterDemo()` and `exitDemo()` in `useDemo.js` (no longer needed)
- Removed auto-enter `useEffect` from `page.js` (localStorage is set before React runs)
- Fixed Supabase client initialization to handle demo-only mode with dummy credentials

**Hydration Mismatch Fixes:**

- Created `useMounted()` hook to prevent SSR/client HTML mismatches when using localStorage
- Fixed hydration errors in: `DemoModeBanner`, `Header`, `dashboard/page.js`, `SpendingCharts` (all 3 chart components)
- All components that read `isDemoMode` now wait for client-side mount before rendering

**CI/CD & Testing:**

- Fixed backup workflow: replaced non-existent `guidelines` table with `household_members`
- Added comprehensive E2E test suite (`demo-only-mode.spec.js`) with 6 passing tests:
  - Login screen never appears on first visit
  - localStorage set before React hydration
  - Demo mode persists on reload
  - Navigation works without login prompts
  - Works in incognito/private browsing
  - No full page reload triggered
- Fixed lint errors (unused imports in `page.js`)
- Updated `@swc/helpers` to resolve CI dependency conflict

### Decisions Made

- **Pre-hydration approach**: Inline script in `<head>` is the cleanest solution - no useEffect, no reload, no race condition
- **useMounted pattern**: Standard React pattern for preventing hydration mismatches when using browser-only APIs
- **Environment variable timing**: `NEXT_PUBLIC_DEMO_ONLY` must be set in Vercel before deployment for the inline script to work (build-time injection)

### Known Issues

- **Vercel deployment limit reached**: Hit the 100 deployments/day free tier limit during debugging. All fixes are committed and ready to deploy when the limit resets in ~6 hours.
- **Manual deployment needed**: Once Vercel limit resets, the fix will auto-deploy successfully to both `chiribudget.vercel.app` and `chiribudgetdemo.vercel.app`

### What Works Now (Local Testing)

- ✅ Demo-only mode loads instantly with no login screen flash
- ✅ No hydration errors
- ✅ No chart dimension errors
- ✅ All 6 E2E tests passing locally
- ✅ Clean console with no warnings

### What's Next

- Wait for Vercel deployment limit to reset (~6 hours)
- Verify production deployment at `chiribudgetdemo.vercel.app`
- Continue with planned backlog items

---

## 2026-01-22 — Number Formatting on Dashboard

### Summary

Added thousand separators (commas) to all currency amounts on Dashboard for better readability.

### Work Completed

**CB-052: Add Thousand Separators to Dashboard (Done)**

- Replaced all `.toFixed()` calls with `.toLocaleString('en-US', { minimumFractionDigits: X, maximumFractionDigits: X })`
- Updated summary cards: Income, Expenses, Net
- Updated income by category amounts
- Updated expenses by category amounts (both with and without limits)
- Updated net by payer amounts
- Updated exceeded amount messages
- Updated test expectations in DashboardSummary.test.js

### Decisions Made

- **Use en-US locale**: Standardized on US number format with commas as thousand separators
- **Maintain decimal precision**: Income/expense totals show 2 decimals, category limits show whole numbers (0 decimals)

### What's Next

- CB-048: Separate demo mode deployment
- Continue with planned backlog items

---

## 2026-01-22 — Default Payer & Household Member Fixes

### Summary

Fixed default payer selection to use logged-in user's name instead of "Together". Fixed critical database bugs preventing household members from seeing each other's profiles. Fixed mobile layout overlap.

### Work Completed

**CB-051: Default Payer to Logged-In User (Done)**

- Updated QuickAddForm to default payer to logged-in user's display name
- Falls back to first option if user name not in payerOptions
- Added 3 unit tests verifying Alex→Alex, Adriana→Adriana, fallback behavior
- Fixed timing bug: Required both `profile.display_name` AND `payerOptions` before setting default
- Fixed mobile layout: Changed grid from 2-column to 1-column on mobile to prevent overlap

**Database Schema Fixes (Critical)**

- Added foreign key constraint: `household_members.user_id` → `profiles.user_id` (enables JOIN in PostgREST)
- Updated RLS policy on `profiles` table to allow household members to read each other's profiles
- These fixes enabled payer dropdown to populate with household member names

### Decisions Made

- **Wait for both values**: Only set default payer when both `profile.display_name` and `payerOptions` are loaded
- **Mobile-first stacking**: Single column on mobile prevents field overlap, maintains 3-column layout on desktop

### What's Next

- CB-048: Separate demo mode deployment
- CLI import script when ready
- Continue with planned backlog items

---

## 2026-01-22 — SEO, Safety Rules & Interbank Parser

### Summary

Completed CB-049 (SEO), CB-045 (Interbank parser), committed safety rules to CLAUDE.md/INSTRUCTIONS.md, and discussed future CLI import tooling.

### Work Completed

**CB-049: SEO & Google Discoverability (Done)**

- Created `src/app/sitemap.js` — generates `/sitemap.xml` with root URL
- Created `src/app/robots.js` — generates `/robots.txt`, disallows auth pages
- Added Open Graph and Twitter meta tags to `layout.js`
- Added `metadataBase` for proper image URL resolution
- Added Google site verification meta tag
- Verified ownership in Google Search Console (URL prefix method)
- Submitted sitemap — Status: Success, 1 page discovered

**CB-045: Interbank CSV Parser (Done)**

- Added Spanish month map and `parseInterbankDate()` for DD-Mon format
- Updated Interbank mapping to actual headers (`Comercio`, `S/`, `US$`)
- Handle dual-currency columns (PEN vs USD per row)
- Added 10 unit tests for date and amount parsing
- Tested with real CSV: 17 transactions parsed, 4 rows filtered (INTERESES, SEGURO, TOTAL, empty)

**Safety Rules (Committed)**

- Updated CLAUDE.md with Hard Stops, Action-Based Check-ins, Task Scoping
- Updated INSTRUCTIONS.md (v1.1) with Task Scoping Rule, Destructive Action Protocol
- Changed 90-minute sync → action-based (5 backlog items, end of session, muffins)

### Decisions Made

- **URL prefix for Search Console**: Domain verification requires DNS access; URL prefix uses HTML meta tag
- **Action-based over time-based sync**: Claude can't reliably track elapsed time
- **Hard stops require explicit "yes"**: Destructive actions need user confirmation
- **Separate dev Supabase project**: Most sustainable approach for isolating test data from production (parked for later)

### Parked for Later

- **CLI import script**: `scripts/import-csv.js` for terminal-based CSV imports
- **Dev Supabase project**: Separate free project for development/testing
- Consider switching to Sonnet model if Opus latency issues persist

### What's Next

- CB-048: Separate demo mode deployment
- CLI import script + dev Supabase setup (when ready)
- Unit tests for offlineStore.js and syncQueue.js

---

## 2026-01-22 — Demo Mode Separation Planning

### Summary

Discussed UX concerns about demo mode and created a backlog item for separating demo and production experiences.

### Work Completed

**CB-048: Separate Demo Mode Deployment (Planned)**

- Identified UX problem: Adriana might accidentally enter demo mode and lose transactions
- Decided on two-part solution:
  1. Separate demo URL (`demo.chiribudget.vercel.app`) for portfolio visitors
  2. Hide "Try Demo Mode" button for returning users on main app
- Added CB-048 to BACKLOG.md as Medium priority

### Decisions Made

- **Separate URLs over cluttered UI**: Prefer clean login screen for household members over adding warnings/confirmations
- **localStorage detection**: Will check for previous auth to determine returning user status

### What's Next

- CB-048 implementation when ready
- Unit tests for offlineStore.js and syncQueue.js
- Manual testing of offline flow
- Bank-specific CSV parsing (blocked on samples)

---

## 2026-01-22 — Offline Translation Keys, Settings Tabs & Documentation Sync

### Summary

Added translation keys for offline UI strings, reorganized Settings page with tabbed interface, and synced all documentation to reflect work completed Jan 20-22.

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

**Documentation Sync**

Updated all documentation to reflect recent feature work:

- `TECH_SPEC.md`: Added section 5.7 Category Spending Limits, updated directory structure with 15+ refactored components, reorganized File Reference into 4 categories
- `OPS.md`: Added GitHub Actions automated backup, in-app backup/restore procedures, CLI restore script documentation
- `README.md`: Updated PWA description to reflect offline support
- `PROGRESS.md`: Added missing entries for Jan 21 work (backup system, category limits, component refactoring)

### What's Next

- Consider unit tests for offlineStore.js and syncQueue.js
- Manual testing of offline flow and sync behavior
- Bank-specific CSV parsing (waiting on PNC and Interbank examples)
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
