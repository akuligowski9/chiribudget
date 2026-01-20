# ChiriBudget Backlog

**Last Updated:** January 19, 2026

---

## Status Flow

```
Planned → In Progress → Done
              ↓
           Blocked
              ↓
           Archived
```

| Status          | Meaning                                               |
| --------------- | ----------------------------------------------------- |
| **Planned**     | Acknowledged, not started                             |
| **In Progress** | Actively being worked on                              |
| **Blocked**     | Cannot proceed without input, decision, or dependency |
| **Done**        | Complete                                              |
| **Archived**    | Was planned, no longer pursuing (kept for history)    |

---

## Critical

No critical items currently.

---

## High

No high priority items currently in progress.

---

## Medium

No medium priority items currently in progress.

---

## Low

### CB-013: Error Monitoring (Sentry)

#### Description

Add Sentry for production error tracking. Free tier sufficient for app scale, helps catch issues before users report them. Install `@sentry/nextjs`, configure DSN, no PII in reports.

#### Acceptance Criteria

- [ ] Sentry SDK installed and configured
- [ ] Errors captured in production without PII
- [ ] Source maps uploaded for readable stack traces

#### Metadata

- **Status:** Planned
- **Priority:** Low
- **Type:** Feature
- **Version:** v2
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### CB-019: Extract Large Components

#### Description

Refactor ImportPanel.jsx (330+ lines) into smaller components. Split into ImportFileUpload, ImportPreview, ImportConfirm for maintainability. Target no component over 200 lines.

#### Acceptance Criteria

- [ ] ImportPanel.jsx split into 3+ smaller components
- [ ] No component exceeds 200 lines
- [ ] All existing tests pass

#### Metadata

- **Status:** Planned
- **Priority:** Low
- **Type:** Maintenance
- **Version:** v2
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### CB-035: Recurring Transactions

#### Description

Auto-populate recurring transactions like monthly bills, rent, and subscriptions. Many household expenses are predictable - rent, utilities, subscriptions, loan payments. Currently users must manually enter these every month, which is tedious and easy to forget.

This feature would allow users to define a transaction template with recurrence rules. The system would auto-generate transactions on scheduled dates. Users should be able to skip individual occurrences (e.g., skipped a subscription month) or edit them (e.g., utility bill varies). Need to design a clear UI for setting recurrence patterns - monthly, weekly, biweekly, or custom intervals.

#### Acceptance Criteria

- [ ] User can define a recurring transaction (amount, category, payer, description)
- [ ] User can set recurrence pattern (monthly, weekly, custom)
- [ ] Recurring transactions auto-populate on scheduled dates
- [ ] User can skip or edit individual occurrences

#### Metadata

- **Status:** Planned
- **Priority:** Low
- **Type:** Feature
- **Version:** v2
- **Assignee:** Unassigned
- **GitHub Issue:** #1

---

### CB-036: Category Budget Limits

#### Description

Set monthly spending caps per category to help enforce household budget agreements. Couples often have informal agreements about spending limits - "let's keep food under $800" or "entertainment shouldn't exceed $200." Currently there's no way to track progress toward these goals or get warnings when approaching limits.

This feature would let users set a monthly budget for each category. The dashboard would show a progress bar or indicator for each category. When spending approaches the limit (e.g., 80%), show a visual warning. When exceeded, make it clearly visible. Store limits in the budget_config table. Consider whether limits should reset monthly or roll over.

#### Acceptance Criteria

- [ ] User can set a monthly budget limit for each category
- [ ] Dashboard shows progress toward each category limit
- [ ] Visual warning when approaching limit (80%)
- [ ] Visual warning when limit exceeded

#### Metadata

- **Status:** Planned
- **Priority:** Low
- **Type:** Feature
- **Version:** v2
- **Assignee:** Unassigned
- **GitHub Issue:** #2

---

### CB-037: Month-over-Month Comparison

#### Description

Show spending trends compared to previous months to help identify patterns and inform budget discussions. Users currently see only the current month's totals. Without historical context, it's hard to know if spending is trending up, down, or stable. Questions like "are we spending more on food lately?" require manual comparison.

This feature would add trend indicators to the dashboard. For each category, show the percentage change from last month - "You spent 20% more on Food this month" or "Entertainment down 15% from last month." Could be a new dashboard section, a toggle on existing charts, or inline badges. Helps couples have data-driven budget conversations.

#### Acceptance Criteria

- [ ] Dashboard shows comparison to previous month for each category
- [ ] Percentage change displayed (increase/decrease)
- [ ] Visual indicator for significant changes

#### Metadata

- **Status:** Planned
- **Priority:** Low
- **Type:** Feature
- **Version:** v2
- **Assignee:** Unassigned
- **GitHub Issue:** #3

---

### CB-038: Shared Shopping List

#### Description

Simple shared list for household shopping needs that complements expense tracking by capturing intent before purchase. Currently the app only tracks what was spent, not what needs to be bought. Households often maintain informal shopping lists - on paper, in notes apps, or in their heads. This leads to duplicate purchases or forgotten items.

This feature would add a shared shopping list that both household members can edit in real-time. Items can be added, checked off, or removed. Consider whether completed items should optionally convert to transactions (e.g., check off "groceries" and prompt to log the expense). Requires a new database table and real-time sync between household members.

#### Acceptance Criteria

- [ ] Both household members can add items to shared list
- [ ] Items can be marked as completed/purchased
- [ ] Real-time sync between household members

#### Metadata

- **Status:** Planned
- **Priority:** Low
- **Type:** Feature
- **Version:** v2
- **Assignee:** Unassigned
- **GitHub Issue:** #4

---

## Parking Lot

Ideas worth remembering but not yet committed to implementation.

### CB-027: Migrate to TypeScript

#### Description

Convert codebase from JavaScript to TypeScript for improved type safety and IDE support. Significant effort (40+ files). Can be done incrementally; generate Supabase types from schema.

#### Acceptance Criteria

- [ ] All files converted to TypeScript
- [ ] Supabase types generated from schema
- [ ] No type errors in build

#### Metadata

- **Status:** Deferred
- **Priority:** Low
- **Type:** Maintenance
- **Version:** v2
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### CB-028: Privacy-Respecting Analytics

#### Description

Add basic usage analytics (Plausible/Umami) without PII. Track active users, transactions/month, feature usage. Low value for 2-person households; privacy implications need careful design.

#### Acceptance Criteria

- [ ] Analytics platform integrated
- [ ] No PII collected
- [ ] Basic usage metrics visible

#### Metadata

- **Status:** Deferred
- **Priority:** Low
- **Type:** Feature
- **Version:** v2
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### CB-030: Auto-Translate Transaction Descriptions

#### Description

Optionally auto-translate descriptions using translation API. Would add latency and ongoing costs. Both household members likely bilingual; cache translations to reduce API calls.

#### Acceptance Criteria

- [ ] Translation toggle in settings
- [ ] Translations cached to reduce API calls
- [ ] Graceful fallback if API unavailable

#### Metadata

- **Status:** Deferred
- **Priority:** Low
- **Type:** Feature
- **Version:** v2
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

## Documented Gaps (Won't Fix)

Known limitations accepted for v1.

### CB-014: Rate Limiting

#### Description

No rate limiting on import endpoint. Acceptable risk for 2-person household app. RLS prevents cross-household abuse.

#### Acceptance Criteria

N/A — Documented gap, not implementing.

#### Metadata

- **Status:** Documented
- **Priority:** Won't Fix
- **Type:** Maintenance
- **Version:** N/A
- **Assignee:** N/A
- **GitHub Issue:** No

---

### CB-015: Two-Factor Auth

#### Description

No 2FA. Magic link provides reasonable security—single-use, expires in 1 hour.

#### Acceptance Criteria

N/A — Documented gap, not implementing.

#### Metadata

- **Status:** Documented
- **Priority:** Won't Fix
- **Type:** Feature
- **Version:** N/A
- **Assignee:** N/A
- **GitHub Issue:** No

---

### CB-016: Offline Support

#### Description

PWA installs but requires internet. Full offline support would require significant complexity.

#### Acceptance Criteria

N/A — Documented gap, not implementing.

#### Metadata

- **Status:** Documented
- **Priority:** Won't Fix
- **Type:** Feature
- **Version:** N/A
- **Assignee:** N/A
- **GitHub Issue:** No

---

## Done

### CB-001: Dead Code Removal

#### Description

Remove unused files (supabaseServer.js, export/route.js) that add confusion and maintenance burden.

#### Acceptance Criteria

- [x] Unused files identified and removed
- [x] No broken imports after removal

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Maintenance
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-002: Multi-User Integration Tests

#### Description

Prove household join flow and RLS isolation work correctly. Automates "partner joins household" scenario. See TECH_SPEC.md#security-model.

#### Acceptance Criteria

- [x] Integration tests for household join flow
- [x] RLS isolation verified between households

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-003: Security Headers

#### Description

Add HTTP security headers (X-Frame-Options, CSP, etc.) to prevent common web attacks. See TECH_SPEC.md#security-model.

#### Acceptance Criteria

- [x] Security headers configured in next.config.js
- [x] Headers verified in production

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-004: Production Verification

#### Description

Final verification that all changes work together—tests pass, build succeeds, manual verification on production.

#### Acceptance Criteria

- [x] All tests pass
- [x] Build succeeds
- [x] Manual verification on production

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Maintenance
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-005: ARIA Accessibility Labels

#### Description

Add ARIA labels to form inputs for screen reader support. Required for WCAG 2.1 Level A.

#### Acceptance Criteria

- [x] All form inputs have ARIA labels
- [x] Screen reader tested

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-006: Remove Unused UI Exports

#### Description

Remove exports for components never imported (CardDescription, SelectGroup, SelectLabel, SelectSeparator).

#### Acceptance Criteria

- [x] Unused exports identified and removed
- [x] No broken imports

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Maintenance
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-007: Focus Indicators

#### Description

Add visible focus indicators for keyboard navigation using :focus-visible styles.

#### Acceptance Criteria

- [x] Focus indicators visible on all interactive elements
- [x] Keyboard navigation tested

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-008: Server-Side Enum Validation

#### Description

Add validation for category/payer/currency fields to prevent invalid data even if client bypassed.

#### Acceptance Criteria

- [x] Server-side validation for enum fields
- [x] Invalid data rejected with error

#### Metadata

- **Status:** Done
- **Priority:** Low
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-009: Household Member Management UI

#### Description

Add UI to view/remove household members and display join code in Settings.

#### Acceptance Criteria

- [x] Member list visible in Settings
- [x] Join code displayed
- [x] Remove member functionality

#### Metadata

- **Status:** Done
- **Priority:** Low
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-010: E2E Tests with Playwright

#### Description

Add end-to-end tests for critical flows (login, create household, add transaction, export). 20 tests across 4 specs.

#### Acceptance Criteria

- [x] E2E tests for login flow
- [x] E2E tests for household creation
- [x] E2E tests for transaction entry
- [x] E2E tests for export

#### Metadata

- **Status:** Done
- **Priority:** Low
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-011: Batch Insert with Rollback

#### Description

Implement batch insert for imports using Supabase RPC with transaction rollback on failure. Migration 003_batch_insert_function.sql.

#### Acceptance Criteria

- [x] Batch insert RPC function created
- [x] Rollback on failure works correctly

#### Metadata

- **Status:** Done
- **Priority:** Low
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-012: Soft Deletes

#### Description

Add soft deletes with 30-day recovery. Deleted transactions visible in Trash view with restore option. Migration 004_soft_deletes.sql.

#### Acceptance Criteria

- [x] Soft delete column added
- [x] Trash view shows deleted items
- [x] Restore functionality works

#### Metadata

- **Status:** Done
- **Priority:** Low
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-017: Improve "Mark Discussed" UX

#### Description

Show warning when trying to mark month discussed with unresolved flags. Require confirmation to proceed.

#### Acceptance Criteria

- [x] Warning shown for unresolved flags
- [x] Confirmation required to proceed

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-018: Mobile Responsiveness Testing

#### Description

Fix mobile layout issues on small screens (<360px). Ensure 44px touch targets.

#### Acceptance Criteria

- [x] Layout works on 320px screens
- [x] Touch targets are 44px minimum

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Bug
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-020: Add Audit Columns

#### Description

Add created_by, updated_by, updated_at columns to track who made changes. UI shows "by you"/"by partner". Migration 001_add_audit_columns.sql.

#### Acceptance Criteria

- [x] Audit columns added to transactions table
- [x] UI displays who made changes

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-021: Remove `rejected` Enum

#### Description

Remove unused `rejected` value from import_status_t enum. Never used in code. Migration 002_remove_rejected_enum.sql.

#### Acceptance Criteria

- [x] Enum value removed
- [x] No references in code

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Maintenance
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-022: Auto-Deploy Workflow

#### Description

Set up GitHub Actions to auto-deploy to Vercel on push to main. Tests run before deploy.

#### Acceptance Criteria

- [x] GitHub Actions workflow configured
- [x] Tests run before deploy
- [x] Auto-deploy to Vercel works

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-023: Database Backup Documentation

#### Description

Document Supabase backup schedule, manual backup, and restore procedures. See docs/OPS.md.

#### Acceptance Criteria

- [x] Backup procedures documented
- [x] Restore procedures documented

#### Metadata

- **Status:** Done
- **Priority:** Low
- **Type:** Maintenance
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-024: Constants File

#### Description

Extract magic numbers (thresholds, FX rate, categories) into centralized constants file. See src/lib/constants.js.

#### Acceptance Criteria

- [x] Constants file created
- [x] Magic numbers extracted

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Maintenance
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-025: Import Sorting Plugin

#### Description

Add eslint-plugin-import for consistent import ordering. Auto-fix via lint-staged.

#### Acceptance Criteria

- [x] Plugin installed and configured
- [x] Auto-fix on commit

#### Metadata

- **Status:** Done
- **Priority:** Low
- **Type:** Maintenance
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-026: Deployment Documentation

#### Description

Document deployment process for Vercel + Supabase setup in README.

#### Acceptance Criteria

- [x] Deployment steps documented
- [x] Environment variables documented

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Maintenance
- **Version:** v1
- **Assignee:** Terminal A
- **GitHub Issue:** No

---

### CB-029: Spanish Language Support

#### Description

Add Spanish translations using next-intl. Language toggle in Settings saves to localStorage. See messages/en.json, messages/es.json.

#### Acceptance Criteria

- [x] Spanish translations added
- [x] Language toggle in Settings
- [x] Preference persists in localStorage

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-031: Dynamic Payer Options

#### Description

Change payer from hardcoded enum to dynamic options from household member display names. "Together" only shows with 2+ members. Changed payer column from enum to text.

#### Acceptance Criteria

- [x] Payer options from household members
- [x] "Together" only with 2+ members
- [x] Database column updated

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-032: Import Batch Grouping

#### Description

CSV imports create import_batches records with metadata (display_name, source_bank, date_range). Batches show as separate sections.

#### Acceptance Criteria

- [x] Import batches table created
- [x] Metadata captured on import
- [x] Batches display as sections

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-033: Import History Toggle

#### Description

Add toggle to show/hide confirmed batches in Review page. Default shows only pending batches.

#### Acceptance Criteria

- [x] Toggle added to Review page
- [x] Default hides confirmed batches

#### Metadata

- **Status:** Done
- **Priority:** Low
- **Type:** Feature
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No

---

### CB-034: Demo Mode Sync Fixes

#### Description

Fix demo mode so changes (add, flag, explain) sync to demoStore and reflect across views.

#### Acceptance Criteria

- [x] Demo transactions sync correctly
- [x] Changes reflect across all views

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Bug
- **Version:** v1
- **Assignee:** Terminal B
- **GitHub Issue:** No
