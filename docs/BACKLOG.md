# ChiriBudget Backlog

**Last Updated:** January 18, 2026

This document tracks all planned work with structured acceptance criteria.

---

## Priority Legend

| Priority  | Meaning                            |
| --------- | ---------------------------------- |
| High      | Blocking or critical for v1 launch |
| Medium    | Important but not blocking         |
| Low       | Nice to have, can defer            |
| Won't Fix | Documented gaps, acceptable for v1 |

---

## HIGH PRIORITY

### CB-001: Dead Code Removal

**Priority:** High
**Status:** Done
**Assignee:** Terminal A
**Tech Spec Reference:** N/A (cleanup)

#### Description

Remove unused files that add confusion and maintenance burden. Dead code makes it harder for new contributors to understand the codebase.

#### Files to Delete

- `src/lib/supabaseServer.js` - Server-side admin client never used
- `src/app/api/export/route.js` - Empty file, export is client-side

#### Acceptance Criteria

- [ ] Files deleted
- [ ] No import errors
- [ ] Tests still pass

---

### CB-002: Multi-User Integration Tests

**Priority:** High
**Status:** Done
**Assignee:** Terminal B
**Tech Spec Reference:** TECH_SPEC.md#security-model

#### Description

Prove that household join flow and RLS isolation work correctly without manual testing. This automates the "wife joins household" scenario.

#### Test Scenarios

1. User A creates household, gets join code
2. User B joins household with code
3. User A adds transaction
4. User B can see User A's transaction (same household)
5. User C (different household) cannot see the transaction

#### Acceptance Criteria

- [ ] Test file created at `src/__tests__/household.integration.test.js`
- [ ] All 5 scenarios covered
- [ ] Tests pass with `npm test`
- [ ] Mocks Supabase client appropriately

---

### CB-003: Security Headers

**Priority:** High
**Status:** Done
**Assignee:** Terminal A
**Tech Spec Reference:** TECH_SPEC.md#security-model

#### Description

Add HTTP security headers to prevent common web attacks. These are defense-in-depth measures that cost nothing to implement.

#### Headers to Add

| Header                  | Value                           | Purpose                 |
| ----------------------- | ------------------------------- | ----------------------- |
| X-Frame-Options         | DENY                            | Prevents clickjacking   |
| X-Content-Type-Options  | nosniff                         | Prevents MIME-sniffing  |
| Referrer-Policy         | strict-origin-when-cross-origin | Limits referrer leakage |
| Content-Security-Policy | (see below)                     | XSS protection          |

#### CSP Policy

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' https://*.supabase.co;
```

#### Acceptance Criteria

- [ ] Headers visible in browser DevTools (Network tab)
- [ ] App still functions correctly
- [ ] No CSP violations in console

---

### CB-004: Production Verification

**Priority:** High
**Status:** Done
**Assignee:** Terminal B
**Tech Spec Reference:** N/A (verification)

#### Description

Final verification that all changes work together before deploying. Catches integration issues early.

#### Verification Steps

1. `npm test` - All tests pass
2. `npm run build` - No build errors
3. `npm run lint` - No lint errors
4. Manual: Add real transaction on chiribudget.vercel.app
5. Manual: Verify dashboard shows transaction

#### Acceptance Criteria

- [ ] All 130+ tests pass
- [ ] Build succeeds
- [ ] Lint passes
- [ ] Manual verification documented

---

## MEDIUM PRIORITY

### CB-005: ARIA Accessibility Labels

**Priority:** Medium
**Status:** Done
**Assignee:** Terminal A
**Tech Spec Reference:** TECH_SPEC.md#feature-specifications

#### Description

Add ARIA labels to make the app usable with screen readers and improve accessibility compliance. Required for WCAG 2.1 Level A.

#### Components to Update

- `QuickAddForm.jsx` - Form inputs need aria-labels
- `LoginScreen.jsx` - Auth form accessibility
- `HouseholdSetup.js` - Join code input
- `TransactionList.jsx` - List semantics

#### Acceptance Criteria

- [ ] All form inputs have aria-labels
- [ ] Interactive elements have proper roles
- [ ] Status messages have aria-live regions
- [ ] No accessibility lint errors

---

### CB-006: Remove Unused UI Exports

**Priority:** Medium
**Status:** Done
**Assignee:** Terminal B
**Tech Spec Reference:** N/A (cleanup)

#### Description

Remove exports for components that are never imported. Prevents confusion and potential runtime errors if someone tries to use them.

#### Unused Exports

**`src/components/ui/card.jsx`:**

- `CardDescription` - Defined but never imported

**`src/components/ui/select.jsx`:**

- `SelectGroup` - Never used
- `SelectLabel` - Never used
- `SelectSeparator` - Never used

#### Acceptance Criteria

- [ ] Unused exports removed
- [ ] No import errors in codebase
- [ ] Tests still pass

---

### CB-007: Focus Indicators

**Priority:** Medium
**Status:** Todo
**Assignee:** Unassigned
**Tech Spec Reference:** TECH_SPEC.md#feature-specifications

#### Description

Add visible focus indicators for keyboard navigation. Essential for users who navigate without a mouse.

#### Implementation

- Add `:focus-visible` styles to all interactive elements
- Ensure sufficient contrast (3:1 minimum)
- Don't rely solely on color

#### Acceptance Criteria

- [ ] All buttons show focus ring when tabbed to
- [ ] All inputs show focus state
- [ ] Focus is visible on both light backgrounds
- [ ] Tab order is logical

---

### CB-017: Improve "Mark Discussed" UX

**Priority:** Medium
**Status:** Todo
**Assignee:** Terminal A
**Tech Spec Reference:** TECH_SPEC.md#feature-specifications

#### Description

Improve the "Mark Discussed" button UX when flagged items are still unresolved. Currently the behavior when trying to mark a month as discussed while flagged transactions exist is confusing.

#### Implementation

- Show clear warning before allowing "Mark Discussed" with unresolved flags
- Option: Block action until all flags resolved
- Option: Show confirmation dialog listing unresolved flags
- Add visual indicator of unresolved flag count

#### Acceptance Criteria

- [ ] User understands why "Mark Discussed" may be blocked
- [ ] Clear path to resolve blocking items
- [ ] Confirmation required if proceeding with unresolved flags
- [ ] Unresolved flag count visible

---

### CB-018: Mobile Responsiveness Testing

**Priority:** Medium
**Status:** Todo
**Assignee:** Terminal A
**Tech Spec Reference:** TECH_SPEC.md#feature-specifications

#### Description

Test and fix mobile responsiveness on small screens (<360px width). Some users have older or smaller devices that may have layout issues.

#### Testing Devices

- iPhone SE (320px width)
- Small Android devices (360px width)
- Tablet portrait mode

#### Acceptance Criteria

- [ ] All forms usable on 320px screens
- [ ] No horizontal scroll on any page
- [ ] Touch targets at least 44px
- [ ] Text readable without zooming

---

### CB-020: Add Audit Columns

**Priority:** Medium
**Status:** Todo
**Assignee:** Terminal A
**Tech Spec Reference:** TECH_SPEC.md#data-model

#### Description

Add `created_by` and `updated_by` audit columns to track who made changes. Useful for households to see which member added/edited transactions.

#### Implementation

- Add `created_by UUID` column to transactions
- Add `updated_by UUID` column to transactions
- Add database triggers to auto-populate from auth.uid()
- Update UI to show creator/editor

#### Acceptance Criteria

- [ ] New transactions have `created_by` set automatically
- [ ] Edited transactions have `updated_by` set
- [ ] UI shows who added each transaction
- [ ] Migration doesn't break existing data

---

### CB-021: Document or Remove `rejected` Enum

**Priority:** Medium
**Status:** Todo
**Assignee:** Terminal A
**Tech Spec Reference:** TECH_SPEC.md#data-model

#### Description

The `rejected` enum value exists in the database but is never used in the app. Either implement rejection workflow or remove the unused value.

#### Options

1. **Remove:** Drop `rejected` from enum, simplify code
2. **Document:** Keep for future "reject transaction" feature

#### Acceptance Criteria

- [ ] Decision documented
- [ ] If removing: enum value dropped, no code references
- [ ] If keeping: documented purpose and future implementation

---

### CB-022: Auto-Deploy Workflow

**Priority:** Medium
**Status:** Done
**Assignee:** Terminal A
**Tech Spec Reference:** TECH_SPEC.md#deployment

#### Description

Set up GitHub Actions workflow to auto-deploy to Vercel on push to main branch. Currently requires manual deploy.

#### Implementation

- Create `.github/workflows/deploy.yml`
- Configure Vercel CLI in workflow
- Run tests before deploy
- Only deploy if tests pass

#### Acceptance Criteria

- [ ] Push to main triggers deployment
- [ ] Tests run before deploy
- [ ] Failed tests block deployment
- [ ] Deployment status visible in GitHub

---

### CB-024: Constants File

**Priority:** Medium
**Status:** Done
**Assignee:** Terminal B
**Tech Spec Reference:** N/A (cleanup)

#### Description

Extract magic numbers and repeated strings into a constants file. Improves maintainability and makes values easier to find and update.

#### Constants to Extract

- Threshold amounts (500 USD, 1625 PEN)
- FX rate (3.25)
- Category list
- Payer list
- Currency list

#### Acceptance Criteria

- [ ] All magic numbers in constants file
- [ ] Single source of truth for enum values
- [ ] No duplicate definitions across codebase
- [ ] Constants importable from `@/lib/constants`

---

### CB-026: Deployment Documentation

**Priority:** Medium
**Status:** Done
**Assignee:** Terminal A
**Tech Spec Reference:** TECH_SPEC.md#deployment

#### Description

Document the deployment process for Vercel + Supabase setup. Help future maintainers understand how to deploy and configure the app.

#### Documentation to Add

- Environment variables needed
- Supabase project setup steps
- Vercel deployment configuration
- Domain/DNS setup (if custom domain)
- Troubleshooting common issues

#### Acceptance Criteria

- [ ] README has deployment section
- [ ] All env vars documented
- [ ] Fresh deploy possible following docs
- [ ] Common issues covered

---

## LOW PRIORITY

### CB-008: Server-Side Enum Validation

**Priority:** Low
**Status:** Todo
**Assignee:** Terminal B
**Tech Spec Reference:** TECH_SPEC.md#data-model

#### Description

Add server-side validation for enum fields to prevent invalid data even if client is bypassed. Currently relies on database constraints.

#### Fields to Validate

- `category` - Must be one of 10 valid categories
- `payer` - Must be alex, adriana, or together
- `currency` - Must be USD or PEN

#### Acceptance Criteria

- [ ] Invalid enum values rejected with clear error
- [ ] Validation runs before database insert
- [ ] Error messages are user-friendly

---

### CB-009: Household Member Management UI

**Priority:** Low
**Status:** Todo
**Assignee:** Terminal A
**Tech Spec Reference:** TECH_SPEC.md#data-model

#### Description

Add UI to view and remove household members. Currently no way to see who's in the household or remove someone.

#### Features

- List all household members with email
- Show when each member joined
- Remove member button (with confirmation)
- Show join code for inviting new members

#### Acceptance Criteria

- [ ] Member list visible in settings
- [ ] Remove member with confirmation dialog
- [ ] Join code displayed with copy button
- [ ] Cannot remove yourself

---

### CB-010: E2E Tests with Playwright

**Priority:** Low
**Status:** Todo
**Assignee:** Terminal B
**Tech Spec Reference:** TECH_SPEC.md#testing-strategy

#### Description

Add end-to-end tests for critical user flows. Catches integration issues that unit tests miss.

#### Critical Flows to Test

1. Login with magic link
2. Create household
3. Add transaction
4. View transaction in list
5. Export to CSV

#### Acceptance Criteria

- [ ] Playwright installed and configured
- [ ] All 5 flows have passing tests
- [ ] Tests run in CI

---

### CB-011: Batch Insert with Rollback

**Priority:** Low
**Status:** Todo
**Assignee:** Terminal B
**Tech Spec Reference:** TECH_SPEC.md#feature-specifications

#### Description

Implement batch insert for imports with transaction rollback. Currently inserts row-by-row, which is slower and can leave partial imports.

#### Implementation

- Use Supabase RPC for batch insert
- Wrap in database transaction
- Rollback if any row fails

#### Acceptance Criteria

- [ ] Import of 100 transactions completes in <2 seconds
- [ ] Partial import leaves no orphan rows
- [ ] Error message shows which row failed

---

### CB-012: Soft Deletes

**Priority:** Low
**Status:** Todo
**Assignee:** Terminal A
**Tech Spec Reference:** TECH_SPEC.md#data-model

#### Description

Add soft deletes for transaction recovery. Currently hard deletes with no way to recover.

#### Implementation

- Add `deleted_at` column to transactions
- Update RLS to filter deleted rows
- Add "Trash" view to restore

#### Acceptance Criteria

- [ ] Deleted transactions not shown in list
- [ ] Trash view shows deleted items
- [ ] Restore button brings back transaction
- [ ] Permanent delete after 30 days (optional)

---

### CB-013: Error Monitoring (Sentry)

**Priority:** Low
**Status:** Todo
**Assignee:** Terminal B
**Tech Spec Reference:** TECH_SPEC.md#deployment

#### Description

Add error monitoring to catch production issues. Free tier is sufficient for this app's scale.

#### Implementation

- Sign up for Sentry free tier
- Install `@sentry/nextjs`
- Configure DSN in environment
- Add to error boundary

#### Acceptance Criteria

- [ ] Sentry receives test error
- [ ] Source maps uploaded for readable stack traces
- [ ] No PII sent to Sentry

---

### CB-019: Extract Large Components

**Priority:** Low
**Status:** Todo
**Assignee:** Terminal A
**Tech Spec Reference:** N/A (refactor)

#### Description

Extract large components into smaller, focused sub-components. ImportPanel is 330+ lines and handles too many concerns.

#### Components to Refactor

- `ImportPanel.jsx` (330+ lines) - Split into:
  - `ImportFileUpload.jsx` - File selection
  - `ImportPreview.jsx` - Preview table
  - `ImportConfirm.jsx` - Confirmation dialog
- Consider extracting form sections from `QuickAddForm.jsx`

#### Acceptance Criteria

- [ ] No component over 200 lines
- [ ] Each component has single responsibility
- [ ] Props are well-typed
- [ ] Tests updated for new components

---

### CB-023: Database Backup Documentation

**Priority:** Low
**Status:** Todo
**Assignee:** Terminal B
**Tech Spec Reference:** TECH_SPEC.md#deployment

#### Description

Document database backup and recovery procedures. Supabase provides automated backups but users should understand how to restore.

#### Documentation to Add

- Supabase backup schedule (automatic)
- How to trigger manual backup
- How to restore from backup
- Point-in-time recovery options
- Export data for local backup

#### Acceptance Criteria

- [ ] Backup frequency documented
- [ ] Restore procedure documented
- [ ] Tested restore process
- [ ] Local export option documented

---

### CB-025: Import Sorting Plugin

**Priority:** Low
**Status:** Todo
**Assignee:** Terminal A
**Tech Spec Reference:** N/A (DX)

#### Description

Add ESLint plugin for consistent import sorting. Reduces merge conflicts and improves code readability.

#### Implementation

- Install `eslint-plugin-import`
- Configure import order rules
- Auto-fix on save in VS Code
- Run on pre-commit hook

#### Acceptance Criteria

- [ ] Plugin installed and configured
- [ ] Imports sorted consistently
- [ ] Auto-fix works on save
- [ ] Pre-commit hook runs sort

---

## v2 FEATURES

These items are deferred to a future major version. They represent significant architectural changes or new feature areas.

### CB-027: Migrate to TypeScript

**Priority:** v2
**Status:** Deferred
**Assignee:** Unassigned
**Tech Spec Reference:** N/A (architecture)

#### Description

Convert the codebase from JavaScript to TypeScript for improved type safety, better IDE support, and fewer runtime errors.

#### Scope

- All React components
- All utility functions
- API routes
- Supabase client types
- Test files

#### Acceptance Criteria

- [ ] All `.js`/`.jsx` files converted to `.ts`/`.tsx`
- [ ] Strict mode enabled
- [ ] No `any` types except where necessary
- [ ] Supabase types generated from schema
- [ ] All tests pass

#### Why Deferred

- Significant effort (40+ files)
- App works correctly now
- Can be done incrementally if needed

---

### CB-028: Privacy-Respecting Analytics

**Priority:** v2
**Status:** Deferred
**Assignee:** Unassigned
**Tech Spec Reference:** TECH_SPEC.md#privacy

#### Description

Add basic usage analytics while respecting user privacy. No PII, no third-party tracking, just aggregate usage data.

#### Options

1. **Plausible** - Privacy-focused, self-hostable
2. **Umami** - Open source, self-hosted
3. **Custom** - Roll own basic counters

#### Metrics to Track

- Active users (household count)
- Transactions per month
- Feature usage (import, export, flags)
- Error rates

#### Acceptance Criteria

- [ ] Analytics provider chosen
- [ ] No PII collected
- [ ] User can opt-out
- [ ] Dashboard shows key metrics

#### Why Deferred

- App works without analytics
- Privacy implications need careful design
- Low value for 2-person households

---

## DOCUMENTED GAPS (Won't Fix for v1)

### CB-014: Rate Limiting

**Priority:** Won't Fix
**Status:** Documented
**Assignee:** N/A

#### Description

No rate limiting on import endpoint. For a 2-person household app, this is acceptable risk.

#### Mitigation

- RLS prevents cross-household abuse
- Import requires authentication
- Supabase has built-in rate limits at infrastructure level

---

### CB-015: Two-Factor Auth

**Priority:** Won't Fix
**Status:** Documented
**Assignee:** N/A

#### Description

No two-factor authentication. Magic link provides reasonable security for this use case.

#### Mitigation

- Magic links are single-use
- Links expire after 1 hour
- Email account security is user's responsibility

---

### CB-016: Offline Support

**Priority:** Low Priority
**Status:** Documented
**Assignee:** Terminal A

#### Description

PWA installs but requires internet. Full offline support would require significant complexity.

#### Mitigation

- App loads quickly when online
- Service worker caches static assets
- Error message shown when offline

---

## Summary Table

| ID     | Title                           | Priority  | Status     | Assignee   |
| ------ | ------------------------------- | --------- | ---------- | ---------- |
| CB-001 | Dead Code Removal               | High      | Done       | Terminal A |
| CB-002 | Multi-User Integration Tests    | High      | Done       | Terminal B |
| CB-003 | Security Headers                | High      | Done       | Terminal A |
| CB-004 | Production Verification         | High      | Done       | Terminal B |
| CB-005 | ARIA Accessibility Labels       | Medium    | Done       | Terminal A |
| CB-006 | Remove Unused UI Exports        | Medium    | Done       | Terminal B |
| CB-007 | Focus Indicators                | Medium    | Todo       | Unassigned |
| CB-017 | Improve "Mark Discussed" UX     | Medium    | Todo       | Terminal A |
| CB-018 | Mobile Responsiveness Testing   | Medium    | Todo       | Terminal A |
| CB-020 | Add Audit Columns               | Medium    | Todo       | Terminal A |
| CB-021 | Document/Remove `rejected` Enum | Medium    | Todo       | Terminal A |
| CB-022 | Auto-Deploy Workflow            | Medium    | Done       | Terminal A |
| CB-024 | Constants File                  | Medium    | Done       | Terminal B |
| CB-026 | Deployment Documentation        | Medium    | Done       | Terminal A |
| CB-008 | Server-Side Enum Validation     | Low       | Todo       | Unassigned |
| CB-009 | Household Member Management UI  | Low       | Todo       | Unassigned |
| CB-010 | E2E Tests with Playwright       | Low       | Todo       | Unassigned |
| CB-011 | Batch Insert with Rollback      | Low       | Todo       | Unassigned |
| CB-012 | Soft Deletes                    | Low       | Todo       | Unassigned |
| CB-013 | Error Monitoring (Sentry)       | Low       | Todo       | Unassigned |
| CB-019 | Extract Large Components        | Low       | Todo       | Unassigned |
| CB-023 | Database Backup Documentation   | Low       | Todo       | Unassigned |
| CB-025 | Import Sorting Plugin           | Low       | Todo       | Unassigned |
| CB-027 | Migrate to TypeScript           | v2        | Deferred   | Unassigned |
| CB-028 | Privacy-Respecting Analytics    | v2        | Deferred   | Unassigned |
| CB-014 | Rate Limiting                   | Won't Fix | Documented | N/A        |
| CB-015 | Two-Factor Auth                 | Won't Fix | Documented | N/A        |
| CB-016 | Offline Support                 | Won't Fix | Documented | N/A        |
