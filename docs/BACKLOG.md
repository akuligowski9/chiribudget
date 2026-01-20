# ChiriBudget Backlog

**Last Updated:** January 19, 2026

---

## Status Flow

```
Planned → In Progress → Done
              ↓
           Blocked
```

| Status          | Meaning                                               |
| --------------- | ----------------------------------------------------- |
| **Planned**     | Acknowledged, not started                             |
| **In Progress** | Actively being worked on                              |
| **Blocked**     | Cannot proceed without input, decision, or dependency |
| **Done**        | Complete                                              |

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

- [ ] CB-013: Error Monitoring (Sentry)
  - Description: Add Sentry for production error tracking. Free tier sufficient for app scale, helps catch issues before users report them.
  - Status: Planned
  - Priority: Low
  - Assignee: Unassigned
  - GitHub Issue: No
  - Notes: Install `@sentry/nextjs`, configure DSN, no PII in reports

- [ ] CB-019: Extract Large Components
  - Description: Refactor ImportPanel.jsx (330+ lines) into smaller components. Split into ImportFileUpload, ImportPreview, ImportConfirm for maintainability.
  - Status: Planned
  - Priority: Low
  - Assignee: Unassigned
  - GitHub Issue: No
  - Notes: Target no component over 200 lines

- [ ] CB-035: Recurring Transactions
  - Description: Auto-populate recurring transactions like monthly bills, rent, and subscriptions. Reduces manual entry for predictable expenses.
  - Status: Planned
  - Priority: Low
  - Assignee: Unassigned
  - GitHub Issue: #1
  - Notes: Need to design recurrence UI (monthly, weekly, custom); option to skip/edit each occurrence

- [ ] CB-036: Category Budget Limits
  - Description: Set monthly spending caps per category. Warn users when approaching or exceeding limits. Helps enforce household budget agreements.
  - Status: Planned
  - Priority: Low
  - Assignee: Unassigned
  - GitHub Issue: #2
  - Notes: Store in budget_config table; visual indicator on dashboard

- [ ] CB-037: Month-over-Month Comparison
  - Description: Show spending trends compared to previous months. "You spent 20% more on Food this month." Helps identify patterns.
  - Status: Planned
  - Priority: Low
  - Assignee: Unassigned
  - GitHub Issue: #3
  - Notes: Could be a new dashboard section or toggle on existing charts

- [ ] CB-038: Shared Shopping List
  - Description: Simple shared list for household shopping needs. Complements expense tracking by capturing intent before purchase.
  - Status: Planned
  - Priority: Low
  - Assignee: Unassigned
  - GitHub Issue: #4
  - Notes: New table needed; consider whether items convert to transactions

---

## Parking Lot

Ideas worth remembering but not yet committed to implementation.

- [ ] CB-027: Migrate to TypeScript
  - Description: Convert codebase from JavaScript to TypeScript for improved type safety and IDE support. Significant effort (40+ files).
  - Status: Deferred
  - Priority: v2
  - Assignee: Unassigned
  - GitHub Issue: No
  - Notes: Can be done incrementally; generate Supabase types from schema

- [ ] CB-028: Privacy-Respecting Analytics
  - Description: Add basic usage analytics (Plausible/Umami) without PII. Track active users, transactions/month, feature usage.
  - Status: Deferred
  - Priority: v2
  - Assignee: Unassigned
  - GitHub Issue: No
  - Notes: Low value for 2-person households; privacy implications need careful design

- [ ] CB-030: Auto-Translate Transaction Descriptions
  - Description: Optionally auto-translate descriptions using translation API. Would add latency and ongoing costs.
  - Status: Deferred
  - Priority: v2
  - Assignee: Unassigned
  - GitHub Issue: No
  - Notes: Both household members likely bilingual; cache translations to reduce API calls

---

## Documented Gaps (Won't Fix)

Known limitations accepted for v1.

- [ ] CB-014: Rate Limiting
  - Description: No rate limiting on import endpoint. Acceptable risk for 2-person household app. RLS prevents cross-household abuse.
  - Status: Documented
  - Priority: Won't Fix
  - Assignee: N/A
  - GitHub Issue: No

- [ ] CB-015: Two-Factor Auth
  - Description: No 2FA. Magic link provides reasonable security—single-use, expires in 1 hour.
  - Status: Documented
  - Priority: Won't Fix
  - Assignee: N/A
  - GitHub Issue: No

- [ ] CB-016: Offline Support
  - Description: PWA installs but requires internet. Full offline support would require significant complexity.
  - Status: Documented
  - Priority: Won't Fix
  - Assignee: N/A
  - GitHub Issue: No

---

## Done

- [x] CB-001: Dead Code Removal
  - Description: Remove unused files (supabaseServer.js, export/route.js) that add confusion and maintenance burden.
  - Status: Done
  - Priority: High
  - Assignee: Terminal A
  - GitHub Issue: No

- [x] CB-002: Multi-User Integration Tests
  - Description: Prove household join flow and RLS isolation work correctly. Automates "partner joins household" scenario.
  - Status: Done
  - Priority: High
  - Assignee: Terminal B
  - GitHub Issue: No
  - Notes: TECH_SPEC.md#security-model

- [x] CB-003: Security Headers
  - Description: Add HTTP security headers (X-Frame-Options, CSP, etc.) to prevent common web attacks.
  - Status: Done
  - Priority: High
  - Assignee: Terminal A
  - GitHub Issue: No
  - Notes: TECH_SPEC.md#security-model

- [x] CB-004: Production Verification
  - Description: Final verification that all changes work together—tests pass, build succeeds, manual verification on production.
  - Status: Done
  - Priority: High
  - Assignee: Terminal B
  - GitHub Issue: No

- [x] CB-005: ARIA Accessibility Labels
  - Description: Add ARIA labels to form inputs for screen reader support. Required for WCAG 2.1 Level A.
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal A
  - GitHub Issue: No

- [x] CB-006: Remove Unused UI Exports
  - Description: Remove exports for components never imported (CardDescription, SelectGroup, SelectLabel, SelectSeparator).
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal B
  - GitHub Issue: No

- [x] CB-007: Focus Indicators
  - Description: Add visible focus indicators for keyboard navigation using :focus-visible styles.
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal A
  - GitHub Issue: No

- [x] CB-008: Server-Side Enum Validation
  - Description: Add validation for category/payer/currency fields to prevent invalid data even if client bypassed.
  - Status: Done
  - Priority: Low
  - Assignee: Terminal B
  - GitHub Issue: No

- [x] CB-009: Household Member Management UI
  - Description: Add UI to view/remove household members and display join code in Settings.
  - Status: Done
  - Priority: Low
  - Assignee: Terminal A
  - GitHub Issue: No

- [x] CB-010: E2E Tests with Playwright
  - Description: Add end-to-end tests for critical flows (login, create household, add transaction, export).
  - Status: Done
  - Priority: Low
  - Assignee: Terminal B
  - GitHub Issue: No
  - Notes: 20 tests across 4 specs

- [x] CB-011: Batch Insert with Rollback
  - Description: Implement batch insert for imports using Supabase RPC with transaction rollback on failure.
  - Status: Done
  - Priority: Low
  - Assignee: Terminal B
  - GitHub Issue: No
  - Notes: Migration 003_batch_insert_function.sql

- [x] CB-012: Soft Deletes
  - Description: Add soft deletes with 30-day recovery. Deleted transactions visible in Trash view with restore option.
  - Status: Done
  - Priority: Low
  - Assignee: Terminal B
  - GitHub Issue: No
  - Notes: Migration 004_soft_deletes.sql

- [x] CB-017: Improve "Mark Discussed" UX
  - Description: Show warning when trying to mark month discussed with unresolved flags. Require confirmation to proceed.
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal A
  - GitHub Issue: No

- [x] CB-018: Mobile Responsiveness Testing
  - Description: Fix mobile layout issues on small screens (<360px). Ensure 44px touch targets.
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal A
  - GitHub Issue: No

- [x] CB-020: Add Audit Columns
  - Description: Add created_by, updated_by, updated_at columns to track who made changes. UI shows "by you"/"by partner".
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal A
  - GitHub Issue: No
  - Notes: Migration 001_add_audit_columns.sql

- [x] CB-021: Remove `rejected` Enum
  - Description: Remove unused `rejected` value from import_status_t enum. Never used in code.
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal A
  - GitHub Issue: No
  - Notes: Migration 002_remove_rejected_enum.sql

- [x] CB-022: Auto-Deploy Workflow
  - Description: Set up GitHub Actions to auto-deploy to Vercel on push to main. Tests run before deploy.
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal A
  - GitHub Issue: No

- [x] CB-023: Database Backup Documentation
  - Description: Document Supabase backup schedule, manual backup, and restore procedures.
  - Status: Done
  - Priority: Low
  - Assignee: Terminal B
  - GitHub Issue: No
  - Notes: docs/OPS.md

- [x] CB-024: Constants File
  - Description: Extract magic numbers (thresholds, FX rate, categories) into centralized constants file.
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal B
  - GitHub Issue: No
  - Notes: src/lib/constants.js

- [x] CB-025: Import Sorting Plugin
  - Description: Add eslint-plugin-import for consistent import ordering. Auto-fix via lint-staged.
  - Status: Done
  - Priority: Low
  - Assignee: Terminal A
  - GitHub Issue: No

- [x] CB-026: Deployment Documentation
  - Description: Document deployment process for Vercel + Supabase setup in README.
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal A
  - GitHub Issue: No

- [x] CB-029: Spanish Language Support
  - Description: Add Spanish translations using next-intl. Language toggle in Settings saves to localStorage.
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal B
  - GitHub Issue: No
  - Notes: messages/en.json, messages/es.json

- [x] CB-031: Dynamic Payer Options
  - Description: Change payer from hardcoded enum to dynamic options from household member display names. "Together" only shows with 2+ members.
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal B
  - GitHub Issue: No
  - Notes: Changed payer column from enum to text

- [x] CB-032: Import Batch Grouping
  - Description: CSV imports create import_batches records with metadata (display_name, source_bank, date_range). Batches show as separate sections.
  - Status: Done
  - Priority: Medium
  - Assignee: Terminal B
  - GitHub Issue: No

- [x] CB-033: Import History Toggle
  - Description: Add toggle to show/hide confirmed batches in Review page. Default shows only pending batches.
  - Status: Done
  - Priority: Low
  - Assignee: Terminal B
  - GitHub Issue: No

- [x] CB-034: Demo Mode Sync Fixes
  - Description: Fix demo mode so changes (add, flag, explain) sync to demoStore and reflect across views.
  - Status: Done
  - Priority: High
  - Assignee: Terminal B
  - GitHub Issue: No
