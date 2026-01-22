# ChiriBudget Backlog

**Last Updated:** January 22, 2026

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

## Reminders

- [ ] **Test restore backup feature** — Upload a backup JSON file via Settings > Data Backup > Restore Backup and verify data restores correctly. _(Added: Jan 22, 2026)_

---

## Critical

No critical items currently.

---

## High

No high priority items currently.

---

## Medium

### CB-047: Tabbed Settings Page

#### Description

Reorganize the Settings page from a single vertical list of 9 collapsible cards to a tabbed interface with 4 category tabs. The current layout requires excessive scrolling and makes it difficult to find specific settings. A tabbed interface groups related settings logically and reduces cognitive load by showing only 2-3 cards at a time.

The tabs will be: Account (Profile, Language), Household (Members, Guidelines), Budget (Conversion Rate, Thresholds, Category Limits), and Data (Backup, Trash). This pattern mirrors iOS/Android settings apps that users are familiar with. Tab state should persist during the session but doesn't need to persist across page reloads.

#### Acceptance Criteria

- [x] Horizontal tab navigation at top of Settings page
- [x] 4 tabs: Account, Household, Budget, Data
- [x] Only active tab's settings components render
- [x] Tab styling matches app design system
- [x] Mobile-friendly tab layout (horizontal scroll if needed)
- [x] English and Spanish translations for tab labels

#### Metadata

- **Status:** Done
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Claude
- **GitHub Issue:** No

---

### CB-044: PNC Bank CSV Parser

#### Description

Add CSV parsing support for PNC Bank export format. Currently the import feature only supports a generic CSV format, requiring manual reformatting of bank exports before import. PNC exports transactions in their own format with specific column names, date formats, and amount representations that differ from the app's expected format.

The parser should auto-detect PNC format based on header columns and map fields appropriately: date column to txn_date, description/memo to description, debit/credit columns to signed amount. This eliminates manual CSV manipulation and reduces friction for regular imports from PNC accounts.

#### Acceptance Criteria

- [ ] Auto-detect PNC CSV format from headers
- [ ] Map PNC columns to transaction fields
- [ ] Handle PNC date format correctly
- [ ] Handle debit/credit amount representation
- [ ] Unit tests for PNC parser

#### Metadata

- **Status:** Blocked
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Unassigned
- **GitHub Issue:** No
- **Blocked By:** Waiting for sample PNC CSV export

---

### CB-045: Interbank (Peru) CSV Parser

#### Description

Add CSV parsing support for Interbank (Peru) export format. Interbank is a Peruvian bank with Spanish-language exports and PEN currency transactions.

The parser should auto-detect Interbank format based on headers (`Fecha,Comercio,S/,US$`) and map fields appropriately, defaulting to PEN currency. Spanish column headers should be recognized. This enables direct import from Interbank account exports without manual reformatting.

**Format Details (from sample analysis):**

| Field       | Header     | Format                  | Example                    |
| ----------- | ---------- | ----------------------- | -------------------------- |
| Date        | `Fecha`    | DD-Mon (Spanish abbrev) | `21-Sep`, `4-Oct`          |
| Description | `Comercio` | Free text               | `Veterinaria My Pet`       |
| PEN Amount  | `S/`       | `S/ ###.##` with commas | `S/ 105.79`, `S/ 3,392.28` |
| USD Amount  | `US$`      | Same format             | (empty if PEN)             |

**Edge cases:**

- Rows without date (INTERESES, SEGURO, TOTAL) should be filtered out
- Amounts need `S/ ` prefix and commas stripped
- Year not in file — infer from context or prompt user

#### Acceptance Criteria

- [ ] Auto-detect Interbank CSV format from headers (`Fecha,Comercio,S/,US$`)
- [ ] Map Interbank columns to transaction fields
- [ ] Handle DD-Mon date format with Spanish month abbreviations
- [ ] Strip `S/ ` prefix and commas from amounts
- [ ] Filter out non-transaction rows (INTERESES, SEGURO, TOTAL)
- [ ] Default currency to PEN (or USD if US$ column has value)
- [ ] Unit tests for Interbank parser

#### Metadata

- **Status:** Planned
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### CB-048: Separate Demo Mode Deployment

#### Description

Currently the main app URL (`chiribudget.vercel.app`) shows both login and "Try Demo Mode" options, creating risk that Adriana accidentally enters demo mode and loses entered transactions. Portfolio visitors and household members use the same entry point, which clutters the UX and creates confusion.

The solution is two-fold: (1) Create a separate demo deployment at `demo.chiribudget.vercel.app` that forces demo mode with no login option, for portfolio visitors. (2) On the main app, hide the "Try Demo Mode" button for returning users who have previously authenticated, prioritizing the login flow.

Implementation requires a `NEXT_PUBLIC_DEMO_ONLY` environment variable, modifications to `LoginScreen.jsx`, and a second Vercel project deployment pointing to the same codebase.

#### Acceptance Criteria

- [ ] `NEXT_PUBLIC_DEMO_ONLY` env var controls demo-only mode
- [ ] When `DEMO_ONLY=true`, app auto-enters demo mode with no login UI
- [ ] Main app hides "Try Demo Mode" for returning users (localStorage check)
- [ ] `demo.chiribudget.vercel.app` deployed with demo-only config
- [ ] Main app login screen remains clean for Adriana

#### Metadata

- **Status:** Planned
- **Priority:** Medium
- **Type:** Feature
- **Version:** v1
- **Assignee:** Unassigned
- **GitHub Issue:** No

---

### CB-049: SEO & Google Discoverability

#### Description

Make ChiriBudget discoverable via Google search for portfolio visibility. Currently the site has no sitemap.xml or robots.txt, so search engines may not index it properly. For a portfolio project, being findable via search ("chiribudget budget app" or similar) adds credibility and discoverability.

Next.js App Router has built-in support for generating sitemap.xml and robots.txt via special files in the app directory. The sitemap should include public pages (landing/login, demo mode entry). Authenticated routes don't need indexing. After deployment, submit the sitemap to Google Search Console to accelerate indexing.

#### Acceptance Criteria

- [x] `sitemap.xml` generated via Next.js App Router
- [x] `robots.txt` allows crawling of public pages
- [x] Meta tags (title, description, og:image) on public pages
- [x] Sitemap submitted to Google Search Console

#### Metadata

- **Status:** Done
- **Priority:** Low
- **Type:** Feature
- **Version:** v1
- **Assignee:** Claude
- **GitHub Issue:** No

---

## Low

### CB-013: Error Monitoring (Sentry)

#### Description

Add Sentry for production error tracking to catch issues before users report them. Currently errors in production go unnoticed until a user complains, which may never happen for non-blocking issues. Silent failures can accumulate and degrade the experience over time.

Sentry's free tier is sufficient for this app's scale. Integration requires installing `@sentry/nextjs`, configuring the DSN, and ensuring no PII (emails, transaction descriptions) is included in error reports. Source maps should be uploaded for readable stack traces.

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

Convert codebase from JavaScript to TypeScript for improved type safety and IDE support. TypeScript catches type errors at compile time, provides better autocomplete in editors, and makes refactoring safer by surfacing breaking changes immediately. The current JavaScript codebase has 40+ files that would need conversion.

Migration can be done incrementally by renaming files to `.tsx`/`.ts` and adding types progressively. Supabase provides tools to generate TypeScript types directly from the database schema, which would eliminate manual type definitions for database entities. This is a significant effort better suited to a dedicated refactoring phase rather than alongside feature work.

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

Add basic usage analytics using a privacy-respecting platform like Plausible or Umami that doesn't collect personally identifiable information. This would track aggregate metrics like active users, transactions per month, and which features are most used. Understanding usage patterns helps prioritize development efforts.

However, for a 2-person household app, the value of analytics is limited since direct feedback is easy to obtain. Privacy implications need careful design to ensure no PII (emails, transaction amounts, descriptions) is ever captured. Self-hosted Umami would give full control over data, while Plausible's hosted option is simpler but requires a paid plan.

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

Optionally auto-translate transaction descriptions between English and Spanish using a translation API like Google Translate or DeepL. This would help when one partner enters a transaction in their native language and the other prefers reading in theirs. A toggle in Settings would enable/disable translation.

However, this adds latency to every transaction display and incurs ongoing API costs per translation. Both household members are likely bilingual, reducing the practical need. Translations should be cached (keyed by hash of original text) to avoid repeated API calls for the same description. This is lower priority given the bilingual context.

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

No rate limiting exists on the import endpoint or any other API routes. An attacker could theoretically flood the endpoint with requests to cause denial of service or exhaust database resources. However, Row-Level Security (RLS) prevents any cross-household data access, limiting damage to the attacker's own household.

For a 2-person household app with no public registration, the attack surface is minimal. Supabase applies its own default rate limits at the infrastructure level. Adding application-level rate limiting would require additional infrastructure (Redis/Upstash) that isn't justified for this use case.

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

No two-factor authentication is implemented beyond the magic link email flow. Traditional 2FA (TOTP apps, SMS codes) would add an extra layer of security requiring something the user knows and something they have. This protects against compromised email accounts being the single point of failure.

However, magic links already provide reasonable security for this use case. Each link is single-use, expires in 1 hour, and requires access to the user's email inbox. For a household budget app without financial transactions, the security/convenience tradeoff favors simplicity. If users have strong email security (2FA on their email provider), that protection extends to this app.

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

### CB-046: Automated Data Backup System

#### Description

Protect household financial data with automated weekly backups stored in a separate private GitHub repository (`chiribudget-backups`). Before uploading real transaction data, having a reliable backup system ensures that database issues, accidental deletions, or migration problems don't result in permanent data loss. This is especially important since Supabase free tier has limited backup retention.

A GitHub Action runs weekly from the main repo, exports all household data from Supabase as JSON, and commits it to the private backup repository. This provides version-controlled backup history at zero cost while keeping financial data separate from the public codebase. The backup includes all discussion history (flagged transaction explanations, monthly discussion notes) so conversation context is never lost.

#### Acceptance Criteria

- [x] Create private `chiribudget-backups` GitHub repo
- [x] GitHub Action workflow runs weekly (e.g., Sunday midnight)
- [x] Exports all tables: transactions (including explanations, flag reasons), budget_config, guidelines, month_status (including discussion_notes), profiles, households
- [x] Commits backup as timestamped JSON to private backup repo
- [x] Retains backup history via git (all versions preserved)
- [x] Action sends notification on failure (GitHub email)
- [x] Documentation for manual restore process from backup

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Version:** v1
- **Assignee:** Claude
- **GitHub Issue:** No

---

### CB-036: Category Spending Limits

#### Description

Add per-category spending limits with configurable auto-flagging behavior. Users set monthly limits per expense category (Food, Fixed Expenses, etc.), and transactions that push spending over the limit can optionally be flagged for discussion. This extends the existing threshold-based flagging system to support category-specific budgets.

The feature adds a JSONB `category_limits` column to `budget_config` storing limit and flag mode per category. Flag modes include: "off" (dashboard warnings only), "crossing" (flag only the transaction that crosses the limit), and "all_after" (flag all transactions after limit is reached). Dashboard shows color-coded progress bars (green/yellow/red) for each category with limits set.

#### Acceptance Criteria

- [x] User can set a monthly spending limit per expense category
- [x] Toggle controls auto-flagging behavior (off, flag crossing, flag all after)
- [x] New "Category Limits" section in Settings page (collapsible card)
- [x] Dashboard shows progress toward each category limit with color-coded indicators
- [x] Green (0-79%), Yellow (80-99%), Red (100%+) progress bars
- [x] Auto-flagging works based on configured flag mode
- [x] Works in both demo mode and authenticated mode
- [x] Translations added for English and Spanish

#### Metadata

- **Status:** Done
- **Priority:** Low
- **Type:** Feature
- **Version:** v2
- **Assignee:** Claude
- **GitHub Issue:** #2

---

### CB-019: Extract Large Components

#### Description

Refactored ImportPanel.js (426 lines) into smaller, more maintainable components. Large components are harder to test, harder to reason about, and more prone to bugs when modified. The import flow has distinct phases that map naturally to separate components.

Split into ImportJsonInput (JSON text input and currency selector), ImportPreview (preview stats and transaction table), and importUtils (helper functions for fingerprinting and normalization). ImportPanel.js is now the orchestration component with state and handlers.

#### Acceptance Criteria

- [x] ImportPanel.js split into 3+ smaller components
- [x] ImportJsonInput.jsx created (63 lines)
- [x] ImportPreview.jsx created (148 lines)
- [x] importUtils.js created (49 lines)
- [x] All existing tests pass

#### Metadata

- **Status:** Done
- **Priority:** Low
- **Type:** Maintenance
- **Version:** v1
- **Assignee:** Claude
- **GitHub Issue:** No

---

### CB-039: Offline Storage Foundation

#### Description

Create the core infrastructure for offline data storage using IndexedDB. This includes an offlineStore module that mirrors the demoStore.js API pattern, a sync queue for tracking pending mutations, and React hooks/context for accessing offline state. The `idb` library (1.3KB) provides a clean Promise-based wrapper around IndexedDB.

The offlineStore supports the same operations as demoStore: get, add, update, delete transactions filtered by month/currency. The sync queue tracks create/update/delete operations made while offline for replay when connectivity returns. This foundation enables all subsequent offline features.

#### Acceptance Criteria

- [x] `idb` package installed
- [x] `src/lib/offlineStore.js` created with IndexedDB operations
- [x] `src/lib/syncQueue.js` created for queue management
- [x] `src/hooks/useNetworkStatus.js` created for online/offline detection
- [x] `src/contexts/OfflineContext.js` created

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Version:** v1
- **Assignee:** Claude
- **GitHub Issue:** No

---

### CB-040: Offline Transaction Writes

#### Description

Modify transaction components to write to local IndexedDB when offline instead of failing. The primary use case is logging expenses immediately after a purchase when there's no internet. QuickAddForm detects offline status and writes to offlineStore, showing "Saved offline" feedback instead of an error.

TransactionList and TodayTransactions merge offline pending transactions with synced data for display. Offline transactions show a pending indicator (cloud-off icon) until synced. This provides a seamless experience where users don't need to think about connectivity.

#### Acceptance Criteria

- [x] QuickAddForm writes to offlineStore when offline
- [x] "Saved offline" toast shown for offline saves
- [x] TransactionList merges offline + synced transactions
- [x] TodayTransactions includes offline transactions
- [x] Pending indicator shown on unsynced transactions

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Version:** v1
- **Assignee:** Claude
- **GitHub Issue:** No

---

### CB-041: Service Worker Setup

#### Description

Create a service worker to cache the app shell (HTML, JS, CSS) so the app loads offline. The PWA manifest existed but there was no service worker - the app failed to load without connectivity. With the service worker, users can open the app and interact with cached data even when offline.

Uses caching strategies: Precache + StaleWhileRevalidate for app shell, CacheFirst for static assets (icons, fonts), NetworkFirst with fallback for API reads. Service worker registered in layout.js via ServiceWorkerRegistration component.

#### Acceptance Criteria

- [x] `public/sw.js` created with caching strategies
- [x] Service worker registered in `src/app/layout.js`
- [x] App shell loads when offline
- [x] Static assets cached for fast loads

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Version:** v1
- **Assignee:** Claude
- **GitHub Issue:** No

---

### CB-042: Sync & Conflict Resolution

#### Description

Implement the sync logic that replays queued offline changes when connectivity returns. Sync triggers on: online event, app visibility change while online, manual button press, and periodic check (every 5 minutes). Queue items processed FIFO to maintain chronological consistency.

For conflict resolution, uses server-wins strategy: before syncing an update, checks server's updated_at timestamp. If server data is newer, discards local change and notifies user. Implements retry with backoff: immediate → 5s → 30s → 5min → 15min, max 10 attempts.

#### Acceptance Criteria

- [x] Sync triggers on online event and visibility change
- [x] Queue processed FIFO with retry backoff
- [x] Conflict detection compares updated_at timestamps
- [x] Server-wins resolution with user notification
- [x] Failed syncs retry with exponential backoff
- [x] Manual "Sync Now" button available

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Version:** v1
- **Assignee:** Claude
- **GitHub Issue:** No

---

### CB-043: Offline UI Indicators

#### Description

Add visual indicators so users know their connectivity status and sync state. A NetworkStatus component shows an orange banner when offline ("Offline - changes sync when connected") with pending count. When online with pending items, shows a yellow badge. Sync errors show a red badge with retry option.

SyncConflictModal displays conflict details when server-wins resolution discards a local change. Header component includes NetworkStatus. Individual transactions with pending sync status show a cloud-off icon.

#### Acceptance Criteria

- [x] `src/components/NetworkStatus.jsx` created
- [x] Offline banner shown when disconnected
- [x] Pending count badge shown when items queued
- [x] `src/components/SyncConflictModal.jsx` created
- [x] Conflict notification shown when local change discarded
- [x] Header includes NetworkStatus component

#### Metadata

- **Status:** Done
- **Priority:** High
- **Type:** Feature
- **Version:** v1
- **Assignee:** Claude
- **GitHub Issue:** No

---

### CB-001: Dead Code Removal

#### Description

Remove unused files that were created during development but never integrated into the final application. Specifically, `supabaseServer.js` (server-side Supabase client that was replaced by client-side approach) and `export/route.js` (API route that was superseded by client-side CSV generation). These files added confusion when navigating the codebase and created maintenance burden when updating dependencies.

Dead code removal improves codebase clarity and reduces the surface area for potential bugs. New contributors won't waste time trying to understand code that isn't actually used. The removal was straightforward since no other files imported these modules.

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

Add integration tests that verify the multi-user household flow works correctly end-to-end. This includes testing that User A can create a household and receive a join code, User B can join with that code, and both users can then see the same transactions. Most importantly, the tests verify that Row-Level Security (RLS) properly isolates households so User C cannot see User A and B's data.

These tests are critical because RLS policies are easy to misconfigure and failures are silent (queries just return empty results). The tests use Supabase's test helpers to simulate multiple authenticated users and verify isolation. See TECH_SPEC.md#security-model for the security architecture these tests validate.

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

Configure HTTP security headers to protect against common web vulnerabilities. This includes X-Frame-Options to prevent clickjacking (embedding the app in malicious iframes), Content-Security-Policy to control which resources can load, X-Content-Type-Options to prevent MIME sniffing, and Referrer-Policy to limit information leakage. These headers are defense-in-depth measures recommended by OWASP.

Headers are configured in `next.config.js` and applied to all responses. The Content-Security-Policy is tuned to allow Supabase connections while blocking inline scripts and external resources. See TECH_SPEC.md#security-model for the complete security architecture.

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

Final verification checkpoint to ensure all v1 changes work correctly together before considering the release complete. This includes running the full test suite (130+ Jest tests, 20 Playwright E2E tests), verifying the production build completes without errors, and manual smoke testing on the deployed Vercel instance. Each feature was tested individually, but integration issues can emerge when combined.

Manual verification covers the critical user paths: sign up, create household, add transaction, flag review, export CSV, and the partner join flow. This step catches any environment-specific issues that automated tests might miss, such as CSP headers blocking legitimate requests or auth redirects failing in production.

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

Add ARIA (Accessible Rich Internet Applications) labels to all form inputs and interactive elements to support screen reader users. This includes `aria-label` for icon-only buttons, `aria-describedby` for inputs with helper text, and proper `aria-labelledby` associations for form groups. These attributes are required for WCAG 2.1 Level A compliance, the minimum accessibility standard.

Screen readers rely on these labels to announce what an element does when focused. Without them, users hear generic descriptions like "button" or "edit text" instead of "Add transaction" or "Enter amount." The app's forms, dialogs, and navigation were audited and labeled to ensure screen reader users can complete all core tasks.

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

Remove exported UI components that were generated by shadcn/ui but never actually used in the application. Specifically, CardDescription, SelectGroup, SelectLabel, and SelectSeparator were exported from their respective component files but no other file imported them. These exports add noise to the codebase and can confuse developers about which components are intended for use.

The shadcn/ui CLI generates comprehensive component files with all possible subcomponents, but most projects only need a subset. Removing unused exports keeps the component API surface clean and signals which parts of each component are actually used. The removal was safe since a grep confirmed no imports existed.

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

Add visible focus indicators for keyboard navigation to ensure users who navigate without a mouse can see which element is currently focused. This is an accessibility requirement (WCAG 2.1) and essential for users with motor disabilities who rely on keyboard navigation. Without visible focus, users lose track of their position in the interface.

The implementation uses `:focus-visible` rather than `:focus` to show focus rings only during keyboard navigation, not mouse clicks. This provides the accessibility benefit without the visual noise of focus rings appearing on every click. Focus styles use a consistent ring color that contrasts with the background and matches the app's design system.

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

Add server-side validation for enumerated fields (category, payer, currency) to ensure data integrity even if client-side validation is bypassed. While the React forms validate these fields before submission, a malicious user could craft direct API requests with invalid values. PostgreSQL enum types provide one layer of protection, but explicit validation gives clearer error messages.

The validation happens in the Supabase RPC functions that handle transaction inserts and updates. Invalid category, payer, or currency values are rejected with a descriptive error before the database query runs. This defense-in-depth approach ensures the database never contains invalid enum values regardless of how the request originated.

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

Add a user interface in Settings to manage household membership, including viewing current members, displaying the join code for inviting partners, and removing members if needed. Previously, household management required direct database access, which was impractical for non-technical users. The join code was only visible during initial household creation.

The Settings page now shows a member list with display names and join dates, the household join code (with copy button), and a remove member button for each member. Removing a member revokes their access immediately via RLS policy updates. The UI prevents self-removal and warns about the implications of removing the last other member.

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

Add end-to-end tests using Playwright to verify that critical user flows work correctly in a real browser environment. E2E tests catch integration issues that unit tests miss, such as CSS hiding buttons, network timing problems, or browser-specific behavior. The test suite covers the four most important flows: login via magic link, household creation, transaction entry, and CSV export.

The 20 tests across 4 spec files run against a test Supabase instance with seeded data. Playwright's auto-waiting and retry logic handle the async nature of the app without flaky explicit waits. Tests run in CI on every push to catch regressions before deployment. The test data is reset between runs to ensure isolation.

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

Implement atomic batch insert for the import workflow so that either all transactions in an import succeed or none do. Previously, imports used individual INSERT statements, which could leave partial data if a failure occurred mid-import (e.g., network error, constraint violation). Users would need to manually clean up the partial import before retrying.

The solution is a PostgreSQL function (`batch_insert_transactions`) that wraps all inserts in a transaction. If any insert fails, the entire batch rolls back automatically. The function is called via Supabase RPC from the client. Migration `003_batch_insert_function.sql` creates this function with proper security definer settings to run with elevated privileges while still respecting RLS for the calling user.

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

Implement soft deletes so that deleted transactions can be recovered within 30 days instead of being permanently lost. Accidental deletions happen, and in a shared household app, one partner might delete a transaction the other wanted to keep. Soft deletes provide a safety net without requiring complex backup/restore procedures.

The implementation adds a `deleted_at` timestamp column to the transactions table. DELETE operations set this timestamp instead of removing the row. A Trash view shows soft-deleted transactions with restore and permanent delete options. A scheduled job (or manual cleanup) permanently removes transactions older than 30 days. Migration `004_soft_deletes.sql` adds the column and updates RLS policies to filter deleted rows by default.

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

Improve the "Mark Discussed" workflow to warn users when they try to close out a month that still has unresolved flagged transactions. Flagged transactions are meant to prompt discussion (e.g., large unexpected expenses), so marking a month as discussed while flags remain defeats the purpose. However, blocking the action entirely would be too rigid—sometimes couples decide a flag doesn't need explanation.

The solution shows a confirmation dialog when unresolved flags exist, listing how many are pending and asking "Are you sure you want to mark this month discussed? X flagged transactions still have no explanation." Users can proceed or go back to add explanations. This balances guidance with flexibility, nudging users toward the intended workflow without forcing it.

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

Fix layout issues on small mobile screens (under 360px width) and ensure all interactive elements meet the 44px minimum touch target size recommended by Apple and Google. The app is designed mobile-first for quick transaction entry, so usability on small devices is critical. Testing revealed text overflow, cramped buttons, and touch targets too small for reliable tapping.

Fixes included adding responsive text truncation, increasing button padding on mobile breakpoints, and spacing out grouped actions. The minimum supported width is now 320px (iPhone SE/5 size). Touch targets were audited using browser dev tools to verify 44x44px minimums. These changes improve usability for real-world mobile usage where users are often entering transactions on the go.

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

Add audit columns to the transactions table to track who created and last modified each record. In a shared household app, knowing who added or changed a transaction helps with accountability and debugging. Without this, disputes about "I didn't add that" have no resolution, and troubleshooting sync issues is difficult.

The implementation adds `created_by`, `updated_by` (both foreign keys to auth.users), and `updated_at` (timestamp auto-updated via trigger) columns. The UI displays this as "Added by you" or "Added by [Partner Name]" in transaction details. Migration `001_add_audit_columns.sql` adds the columns and creates the trigger function that sets `updated_by` and `updated_at` on every UPDATE.

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

Remove the unused `rejected` value from the `import_status_t` PostgreSQL enum type. This value was added during initial design anticipating a workflow where users could reject individual imported transactions, but that workflow was never implemented. The import flow simply confirms or discards entire batches. Keeping unused enum values adds confusion about what states are actually possible.

PostgreSQL enums are tricky to modify (you can add values easily but removing requires recreating the type), so this was done via migration `002_remove_rejected_enum.sql`. The migration creates a new enum without `rejected`, migrates all columns to use it, then drops the old type. No data migration was needed since no rows ever had the `rejected` status.

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

Set up GitHub Actions workflows for continuous integration and deployment to Vercel. Manual deployments are error-prone and easy to forget, leading to production diverging from the repository. Automated deployment ensures every push to main is deployed after passing quality checks.

Two workflows were created: CI (`.github/workflows/ci.yml`) runs on every push and PR, checking formatting, running lint, running tests, and verifying the build. Deploy (`.github/workflows/deploy.yml`) runs after CI passes on main/master and triggers a Vercel deployment using the Vercel CLI. This requires a `VERCEL_TOKEN` secret in GitHub. The setup ensures no broken code reaches production and reduces the "works on my machine" problem.

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

Document the database backup and recovery procedures so that data can be restored if something goes wrong. Supabase provides automatic daily backups, but understanding the retention period, how to trigger manual backups, and how to restore from a backup is critical operational knowledge. Without documentation, a data loss incident could result in scrambling to figure out recovery options under pressure.

The documentation in `docs/OPS.md` covers Supabase's automatic backup schedule by plan tier, how to access backups in the dashboard, manual backup options (CLI dump, CSV export via app), and step-by-step restore procedures. It also documents post-restore integrity checks to verify data is complete. This operational knowledge is separate from feature documentation and lives in the OPS runbook.

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

Extract magic numbers and configuration values scattered throughout the codebase into a centralized constants file. Values like the flagging threshold ($500 USD / 1625 PEN), the USD/PEN exchange rate (3.25), and the category lists were hardcoded in multiple places. This made changes error-prone—updating the threshold meant finding and updating every occurrence.

The new `src/lib/constants.js` file exports all configuration values from one place: `THRESHOLD_USD`, `THRESHOLD_PEN`, `FX_RATE`, `CURRENCIES`, `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES`, and `PAYER_OPTIONS`. Components import what they need, and changes only require updating one file. The file also serves as documentation of the app's business rules in one readable location.

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

Add eslint-plugin-import to enforce consistent import statement ordering across the codebase. Without a standard, import sections become messy—mixing React imports with local files with third-party libraries in random order. This makes it harder to scan files and leads to inconsistent style between developers. Consistent ordering also makes merge conflicts in import sections less common.

The plugin is configured to group imports in a logical order: React first, then external packages, then internal aliases (`@/`), then relative imports. Within each group, imports are sorted alphabetically. The `lint-staged` configuration runs the auto-fixer on commit, so developers don't need to manually sort imports—they're automatically organized when code is committed.

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

Document the complete deployment process for running ChiriBudget on Vercel with Supabase so that others can fork and deploy their own instance. The app is designed to be fork-friendly—couples should be able to run their own private deployment without depending on a central service. Without clear documentation, the setup process would require reverse-engineering from the codebase.

The README now includes step-by-step instructions for: creating a Supabase project, running the schema SQL, configuring auth settings, obtaining API keys, setting environment variables, deploying to Vercel, and optional GitHub Actions CI/CD setup. It also includes a troubleshooting section for common issues like magic links not arriving or RLS errors. This documentation makes the project genuinely usable by others, not just a portfolio piece.

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

Add Spanish language support using next-intl for internationalization. The app is used by a bilingual household where one partner prefers Spanish, so offering both languages improves usability for both users. Translations cover all UI text including button labels, form fields, error messages, and dashboard sections.

The implementation uses next-intl's client-side approach with translation JSON files (`messages/en.json`, `messages/es.json`). A language toggle in Settings lets users switch between English and Spanish, with the preference saved to localStorage so it persists across sessions. The toggle updates immediately without requiring a page reload. Translation keys are organized by component/section for maintainability.

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

Change the payer field from a hardcoded enum ("alex", "adriana", "together") to dynamic options based on actual household member display names. The hardcoded approach assumed specific users and wouldn't work for other households using the app. This change makes the app genuinely usable by any two-person household, not just the original developers.

The implementation queries household members on auth context load and builds payer options from their display names. The "Together" option only appears when 2+ members exist in the household. The database column was changed from enum to text type (via migration) to support arbitrary names. All components using payer dropdowns (QuickAddForm, ImportUpload, TransactionList, etc.) were updated to use the dynamic options.

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

Track CSV imports as batches with metadata so users can see where transactions came from and manage imports as logical groups. Previously, imported transactions were indistinguishable from manually entered ones after import. Users had no way to review or undo a specific import session, and troubleshooting duplicate imports was difficult.

The implementation creates an `import_batches` table record for each import with metadata: display name, source bank, default payer, transaction year, and date range of included transactions. The Review page shows batches as collapsible sections with their metadata. Users can confirm or discard entire batches. This makes the import history transparent and manageable, especially when importing from multiple bank accounts.

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

Add a toggle to the Review page that shows or hides already-confirmed import batches. By default, only pending (unconfirmed) batches are shown since those are what need attention. However, users sometimes need to reference past imports to check what was included or verify that a previous import completed correctly.

The toggle is labeled "Show History" and when enabled displays confirmed batches in a visually distinct style (muted colors, collapsed by default). This keeps the default view focused on actionable items while still providing access to historical data when needed. The toggle state is not persisted—it resets to hidden on page reload to keep the default experience clean.

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

Fix bugs in demo mode where changes made in one view didn't reflect in other views. Demo mode uses an in-memory store (`demoStore.js`) instead of Supabase, but components weren't consistently calling the store's update methods. Adding a transaction via QuickAddForm wouldn't appear in TodayTransactions. Flagging a transaction in one view wouldn't show the flag in another.

The fix required updating all components that modify transactions (QuickAddForm, FlaggedReview, TodayTransactions, TransactionList) to call the appropriate demoStore methods (`addDemoTransaction`, `updateDemoTransaction`) when in demo mode. This ensures the in-memory store stays in sync and all views read from the same source of truth. Demo mode now behaves identically to authenticated mode from the user's perspective.

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
