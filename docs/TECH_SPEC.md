# ChiriBudget Technical Specification

**Version:** 1.0
**Last Updated:** January 2026
**Status:** Production

---

## 1. Overview

### 1.1 Purpose

ChiriBudget is a shared household budgeting application designed for two-person households. It enables partners to collaboratively track income and expenses, review flagged transactions, and maintain monthly financial discussions.

### 1.2 Goals

- **Simplicity**: Quick transaction entry without friction
- **Accountability**: Flagged transactions require explanation before marking month as discussed
- **Privacy**: Complete household isolation via Row-Level Security (RLS)
- **Portability**: Import from external sources, export to CSV for analysis

### 1.3 Non-Goals

- Complex multi-account banking integrations
- Investment portfolio tracking
- Bill reminders or recurring transaction automation
- Offline-first architecture (basic offline support exists, but app is online-primary)

---

## 2. Architecture

### 2.1 Tech Stack

| Layer    | Technology              | Purpose                              |
| -------- | ----------------------- | ------------------------------------ |
| Frontend | Next.js 16 (App Router) | SSR, routing, React 18               |
| UI       | Tailwind CSS + Radix UI | Styling, accessible primitives       |
| Backend  | Supabase (PostgreSQL)   | Database, Auth, RLS                  |
| Hosting  | Vercel                  | Edge deployment, CDN                 |
| PWA      | Service Worker + idb    | Installable app with offline support |

### 2.2 Directory Structure

```
src/
├── app/                         # Next.js App Router
│   ├── page.js                 # Home (transaction entry)
│   ├── dashboard/              # Analytics & review
│   ├── settings/               # Settings page with tabs
│   ├── layout.js               # Root layout with providers
│   └── globals.css             # Global styles
├── components/                  # React components ("use client")
│   ├── ui/                     # Reusable UI primitives
│   ├── QuickAddForm.jsx        # Transaction entry form
│   ├── TransactionList.jsx     # Transaction list (orchestrator)
│   ├── TransactionCard.jsx     # Single transaction display
│   ├── TransactionSearchSort.jsx
│   ├── TransactionPagination.jsx
│   ├── ImportPanel.jsx         # JSON import (orchestrator)
│   ├── ImportJsonInput.jsx     # JSON textarea + currency
│   ├── ImportPreview.jsx       # Import preview table
│   ├── ImportUpload.jsx        # CSV upload (orchestrator)
│   ├── ImportFileDropzone.jsx  # File drag/drop zone
│   ├── ImportOptionsForm.jsx   # Bank/year/payer selectors
│   ├── NetworkStatus.jsx       # Offline status banner
│   ├── CategoryLimitsSettings.jsx
│   ├── BackupSettings.jsx      # Backup download/restore
│   └── ...
├── contexts/                    # React Context providers
│   ├── AuthContext.js          # Authentication state
│   └── OfflineContext.js       # Offline state and sync
├── hooks/                       # Custom React hooks
│   ├── useDemo.js              # Demo mode detection
│   └── useNetworkStatus.js     # Online/offline detection
└── lib/                         # Utilities & business logic
    ├── supabaseClient.js       # Supabase browser client
    ├── categories.js           # Enums and constants
    ├── demoStore.js            # In-memory demo storage
    ├── offlineStore.js         # IndexedDB offline storage
    ├── syncQueue.js            # Offline sync queue
    ├── csvParserUtils.js       # Bank CSV parsing helpers
    ├── importUtils.js          # Import fingerprinting
    ├── transactionUtils.js     # Transaction helpers
    ├── format.js               # Number/date formatting
    ├── csv.js                  # CSV generation
    └── constants.js            # Magic numbers
```

### 2.3 Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Supabase  │────▶│  PostgreSQL │
│  (Next.js)  │◀────│    Auth     │◀────│    + RLS    │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ├──▶ Demo Mode (localStorage flag → in-memory store)
       │
       └──▶ Offline Mode (IndexedDB → sync queue → Supabase)
```

---

## 3. Data Model

### 3.1 Entity Relationship

```
households (1) ─────┬───── (N) household_members
                    │
                    ├───── (N) transactions
                    │
                    ├───── (N) month_status
                    │
                    ├───── (N) import_batches
                    │
                    ├───── (1) budget_config
                    │
                    └───── (N) errors

profiles (1) ─────────────── (1) user (Supabase Auth)
```

### 3.2 Core Tables

#### `households`

Central organizational unit. Each household has a unique join code for partner onboarding.

| Column     | Type        | Notes                        |
| ---------- | ----------- | ---------------------------- |
| id         | uuid        | Primary key                  |
| name       | text        | Display name (e.g., "A&A")   |
| join_code  | text        | 12-char hex code for joining |
| created_at | timestamptz |                              |

#### `transactions`

All income and expenses.

| Column       | Type          | Notes                        |
| ------------ | ------------- | ---------------------------- |
| id           | uuid          | Primary key                  |
| household_id | uuid          | FK to households             |
| txn_date     | date          | When it occurred             |
| currency     | currency_t    | USD or PEN                   |
| amount       | numeric(12,2) | Negative = expense           |
| description  | text          | Optional                     |
| category     | category_t    | Enum (10 values)             |
| payer        | payer_t       | alex, adriana, together      |
| is_flagged   | boolean       | Auto-set for over-threshold  |
| flag_reason  | text          | Why it was flagged           |
| explanation  | text          | User-provided justification  |
| resolved_at  | timestamptz   | When explanation was added   |
| fingerprint  | text          | Unique per household (dedup) |
| source       | text          | manual or import             |

#### `month_status`

Tracks monthly discussion state per currency.

| Column           | Type           | Notes              |
| ---------------- | -------------- | ------------------ |
| household_id     | uuid           | FK                 |
| month            | text           | YYYY-MM format     |
| currency         | currency_t     | USD or PEN         |
| status           | month_status_t | draft or discussed |
| discussion_notes | text           | What was agreed    |

### 3.3 Enums

```sql
payer_t: alex, adriana, together
currency_t: USD, PEN
month_status_t: draft, discussed
import_status_t: staged, confirmed
category_t: Fixed Expenses, Rent/Mortgages, Food, Dogs,
            Holidays & Birthdays, Adventure, Unexpected,
            Salary, Investments, Extra
```

---

## 4. Security Model

### 4.1 Authentication

- **Method**: Magic link (passwordless email)
- **Provider**: Supabase Auth
- **Session**: JWT stored in browser, auto-refreshed

### 4.2 Authorization (RLS)

All tables have Row-Level Security enabled. The core pattern:

```sql
-- Helper function
CREATE FUNCTION is_household_member(hid uuid) RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hid AND user_id = auth.uid()
  );
$$ LANGUAGE sql STABLE;

-- Example policy
CREATE POLICY tx_read ON transactions
FOR SELECT USING (is_household_member(household_id));
```

**Key Policies:**

- Users can only read/write data for households they belong to
- Users can only modify their own profile
- Household creation is unrestricted (anyone can create)
- Joining requires valid join code (enforced at app level)

### 4.3 Data Isolation

Households are completely isolated. User A in Household 1 cannot see any data from Household 2, even if they know the UUIDs.

---

## 5. Feature Specifications

### 5.1 Quick Add

**Purpose**: Rapid transaction entry from mobile

**Flow**:

1. User fills form (date, amount, currency, category, payer, description)
2. Client generates fingerprint: `SHA256(date + amount + description)`
3. Submit to Supabase
4. Database trigger auto-flags if over threshold
5. Toast confirms success

**Validation**:

- Amount: Required, max $999,999.99
- Date: Required, not in future
- Description: Max 200 characters
- Category/Payer/Currency: Required enums

**Edge Cases**:

- Duplicate fingerprint: Rejected by unique constraint, user sees error
- Network failure mid-submit: Transaction not saved, user can retry
- Threshold exactly equal: Not flagged (must exceed threshold)

**Decisions**:

- Fingerprint uses description (not just date+amount) to allow same-day same-amount purchases at different stores
- Negative amounts = expenses, positive = income (convention from original design)

### 5.2 Import Preview

**Purpose**: Bulk import with verification before commit

**Flow**:

1. User pastes JSON array or uploads CSV
2. Client parses and validates structure
3. Preview shows: count, total, duplicates detected
4. User confirms
5. Transactions inserted with `source: 'import'`, linked to import_batch

**JSON Format**:

```json
[
  {
    "date": "2024-01-15",
    "description": "Grocery store",
    "amount": -125.5,
    "payer": "alex"
  }
]
```

**Edge Cases**:

- Empty file: Rejected with clear error message
- Malformed JSON/CSV: Parse error shown, no partial import
- All duplicates: Success with "0 new, N skipped" message
- Mixed valid/invalid rows: Valid rows imported, invalid rows listed for manual entry

**Decisions**:

- CSV import creates import_batch record for grouping/tracking
- Duplicates silently skipped (not errors) to allow re-importing same file safely
- Batch insert via RPC for atomicity and performance

### 5.3 Dashboard

**Purpose**: Monthly review and accountability

**Components**:

- Month/currency selector
- Category breakdown (pie/bar charts)
- Net by payer (dynamic from household members)
- Flagged transactions list
- Discussion notes editor
- "Mark Discussed" button (warning if unresolved flags)

**Edge Cases**:

- No transactions in month: Empty state with helpful message
- Single household member: "Together" option hidden, only shows individual
- All flags resolved mid-session: UI updates, "Mark Discussed" enabled

**Decisions**:

- "Mark Discussed" shows confirmation dialog if unresolved flags exist, but doesn't block
- Payer breakdown uses dynamic names from household_members, not hardcoded

### 5.4 Auto-Flagging

**Purpose**: Surface large transactions for discussion

**Rules** (enforced by database trigger):

- Expense > threshold → category = 'Unexpected', is_flagged = true
- Income > threshold → category = 'Extra', is_flagged = true

**Default Thresholds**:

- USD: $500
- PEN: 1625 (500 × 3.25 FX rate)

**Edge Cases**:

- Threshold exactly equal: Not flagged (must strictly exceed)
- Threshold changed after transaction: Existing flags unchanged until re-flagging
- Manual category override: User can change category, flag persists

**Decisions**:

- Auto-flagging overrides user-selected category (forces Unexpected/Extra)
- Thresholds configurable per household via budget_config table
- FX rate stored in config for PEN threshold calculation

### 5.5 Demo Mode

**Purpose**: Portfolio showcase without real data

**Detection**: `localStorage.getItem('chiribudget_demo') === 'true'`

**Behavior**:

- All Supabase calls bypassed
- Uses `demo/transactions.json` (41 sample transactions)
- Import preview works but doesn't persist
- No authentication required

**Edge Cases**:

- Browser clears localStorage: Demo mode exits, user sees login screen
- Demo user tries to access Settings: Profile shows demo placeholder data
- Demo user deletes transaction: Removed from demoStore for session only

**Decisions**:

- Demo changes stored in demoStore (in-memory) and sync across components
- Demo payers use fallback list since no real household members exist
- Demo mode indicated by banner at top of screen

### 5.6 Offline Support

**Purpose**: Allow transaction entry without internet connectivity

**Detection**: `navigator.onLine` and `online`/`offline` events via `useNetworkStatus` hook

**Behavior**:

- When offline, QuickAddForm writes to IndexedDB via offlineStore
- Pending transactions shown with cloud-off indicator
- NetworkStatus banner shows offline state and pending count
- When online, sync queue replays pending changes to Supabase

**Sync Triggers**:

- Browser `online` event
- App visibility change (tab becomes active)
- Manual "Sync now" button
- Periodic check (every 5 minutes)

**Conflict Resolution**:

- Server-wins strategy: if server data is newer, local change is discarded
- SyncConflictModal notifies user when their change couldn't be applied
- Retry backoff: immediate → 5s → 30s → 5min → 15min (max 10 attempts)

**Edge Cases**:

- Network fails mid-sync: Transaction stays in queue, retries later
- Partner edits same transaction: Server version wins, user notified
- IndexedDB unavailable: Falls back to online-only mode

**Decisions**:

- IndexedDB via `idb` library (1.3KB) for clean Promise-based API
- Server-wins conflict resolution: simple and safe for 2-person household
- Offline store mirrors demoStore API pattern for consistency

### 5.7 Category Spending Limits

**Purpose**: Set monthly spending caps per category with optional auto-flagging

**Data Storage**: `budget_config.category_limits` JSONB column storing:

```json
{
  "Food": { "limit": 500, "flagMode": "crossing" },
  "Adventure": { "limit": 200, "flagMode": "off" }
}
```

**Flag Modes**:

- `off`: Dashboard warnings only, no auto-flagging
- `crossing`: Flag only the transaction that crosses the limit
- `all_after`: Flag all transactions after limit is reached

**Dashboard Display**:

- Progress bars for each category with a limit set
- Color coding: green (0-79%), yellow (80-99%), red (100%+)
- Shows amount remaining or amount over limit

**Edge Cases**:

- Limit changed mid-month: Recalculates flags on next transaction
- Multiple transactions in same request: Each evaluated sequentially
- Currency mismatch: Limits in USD, PEN converted using household FX rate

**Decisions**:

- USD-only limits: Simplifies UX; conversion handled automatically
- Limits stored per-household in budget_config, not per-user
- Flag mode gives flexibility for different spending philosophies

### 5.8 Period-over-Period Comparison

**Purpose**: Show spending trends by comparing current period to equivalent previous period

**Components**:

- `CategoryComparisonBadge`: Inline percentage badge next to each category
- `PeriodComparisonSection`: Collapsible table with full comparison details
- Automatic previous period calculation based on date range preset

**Comparison Logic**:

Date range mappings for each preset:

- **Day**: Previous day (current - 1 day)
- **Week**: Previous week (current - 7 days)
- **Month**: Previous month (handles month-end edge cases)
- **Quarter**: Previous quarter (current - 3 months)
- **Year**: Previous year (same dates, previous year)
- **Custom**: Shift backward by range duration

**Badge Display Rules**:

- Only shows if change ≥ 5% (configurable threshold)
- Shows "NEW" for categories that didn't exist in previous period
- Type-aware coloring:
  - Expenses: Green for decrease (good), Amber/Red for increase (bad)
  - Income: Green for increase (good), Amber/Red for decrease (bad)
- Arrow icons indicate direction (↑/↓)

**Comparison Section**:

- Collapsed by default, expandable via chevron button
- Shows "Comparing to: [previous period dates]" label
- Full table with columns: Category | Current | Previous | Change %
- "Key Insights" section highlights top 5 significant changes
- Shows "No significant changes" if all changes < 10% threshold

**Edge Cases**:

- First month of usage: No badges, comparison section shows "Not enough data"
- Month-end dates (Jan 31 → Feb): Uses date-fns endOfMonth for correct last day
- Leap year (Feb 29): Handles correctly using date-fns date arithmetic
- Previous period has zero spending: Shows "NEW" badge, no percentage
- Both periods have zero: No badge displayed (not significant)
- Custom ranges crossing year boundaries: Shifts by exact duration in days

**Decisions**:

- Progressive disclosure: Inline badges for quick scanning, collapsible section for details
- date-fns library: Robust date handling for month boundaries and leap years
- 5% badge threshold, 10% insight threshold: Balance between signal and noise
- Server-wins for date calculation: Calculate previous period dates in dashboard/page.js
- Works in demo mode: Uses getDemoTransactions with previous month calculation
- Applies currency conversion to both periods before comparison

**Data Flow**:

```
dashboard/page.js
  └─▶ getPreviousPeriodRange(preset, startDate, endDate)
       └─▶ { previousStartDate, previousEndDate }

DashboardSummary.jsx
  ├─▶ Fetch previous period transactions (Supabase or demo)
  ├─▶ Convert to display currency
  ├─▶ calculateCategoryComparison(current, previous)
  │     └─▶ { category: { current, previous, delta, percentChange, trend, isNew } }
  ├─▶ CategoryComparisonBadge (inline next to amounts)
  └─▶ PeriodComparisonSection (collapsible below charts)
        └─▶ generateInsights(comparisonData, type, threshold)
              └─▶ [{ category, change, type, percentChange }]
```

---

## 6. API Design

### 6.1 Client-Side Only

ChiriBudget uses Supabase's client SDK directly. No custom API routes are needed because RLS handles authorization.

**Pattern**:

```javascript
const { data, error } = await supabase
  .from('transactions')
  .select('*')
  .eq('household_id', householdId)
  .order('txn_date', { ascending: false });
```

### 6.2 Real-time (Not Implemented)

Supabase supports real-time subscriptions but they are not currently used. Future enhancement for live updates between partners.

---

## 7. Performance

### 7.1 Database Indexes

```sql
-- Primary query pattern: filter by household, currency, date range
CREATE INDEX idx_transactions_household_currency_date
ON transactions (household_id, currency, txn_date);

-- Flagged transaction lookup
CREATE INDEX idx_transactions_household_flagged
ON transactions (household_id, is_flagged)
WHERE is_flagged = true;

-- Month status lookup
CREATE INDEX idx_month_status_household_month_currency
ON month_status (household_id, month, currency);
```

### 7.2 Client Optimizations

- Pagination: 25 transactions per page
- Debounced search: 300ms delay
- Memoized calculations: `useMemo` for category totals

---

## 8. Deployment

### 8.1 Environment Variables

| Variable                      | Required | Description                       |
| ----------------------------- | -------- | --------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | Yes      | Supabase project URL              |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Yes      | Public anon key (safe for client) |

### 8.2 Vercel Configuration

- Framework: Next.js (auto-detected)
- Build command: `npm run build`
- Output: `.next`
- Node version: 18.x

### 8.3 Supabase Setup

1. Create project at supabase.com
2. Run `supabase/schema.sql` in SQL Editor
3. Enable Email auth provider
4. Copy URL and anon key to Vercel env vars

---

## 9. Testing Strategy

### 9.1 Current Coverage

| Type      | Framework             | Count      |
| --------- | --------------------- | ---------- |
| Unit      | Jest                  | 130+ tests |
| Component | React Testing Library | Integrated |
| E2E       | (Not implemented)     | -          |

### 9.2 Test Structure

```
src/
├── lib/__tests__/
│   ├── format.test.js
│   ├── csv.test.js
│   ├── categories.test.js
│   └── demoStore.test.js
└── components/__tests__/
    ├── QuickAddForm.test.js
    └── TransactionList.test.js
```

### 9.3 Running Tests

```bash
npm test              # Single run
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

---

## 10. External Integrations

### 10.1 Supabase

- **Auth**: Magic link email authentication
- **Database**: PostgreSQL with Row-Level Security
- **Client SDK**: `@supabase/supabase-js` for browser-side queries
- **Real-time**: Not currently used (future consideration)

### 10.2 Vercel

- **Hosting**: Edge deployment with global CDN
- **CI/CD**: GitHub Actions triggers deploy on push to main
- **Environment**: Node.js 18.x runtime

### 10.3 No Other External Services

ChiriBudget intentionally avoids third-party services for:

- Analytics (privacy)
- Error tracking (planned: Sentry)
- Translation APIs (deferred)
- Banking integrations (out of scope)

---

## 11. Open Questions & Risks

### 11.1 Open Questions

| Question                  | Context                                                     | Status                |
| ------------------------- | ----------------------------------------------------------- | --------------------- |
| Bank CSV formats          | Need examples from BCP, Interbank to build parsers          | Waiting on user input |
| Threshold re-flagging UX  | How to handle existing transactions when threshold changes? | Deferred              |
| Multi-currency households | What if household uses 3+ currencies?                       | Out of scope for v1   |

### 11.2 Known Risks

| Risk                         | Impact                               | Mitigation                                          |
| ---------------------------- | ------------------------------------ | --------------------------------------------------- |
| Supabase downtime            | App unusable                         | Accept for personal project; Supabase has 99.9% SLA |
| Magic link email delivery    | Users can't log in                   | Document troubleshooting; check spam folder         |
| Demo data staleness          | Demo doesn't reflect latest features | Manually update demo/transactions.json              |
| Browser localStorage cleared | Demo mode exits unexpectedly         | Session-only impact; no data loss                   |

### 11.3 Documented Gaps (Acceptable for v1)

- No rate limiting (low risk for 2-person app, RLS prevents abuse)
- No two-factor auth (magic link is single-use, expires in 1 hour)

---

## Appendix A: File Reference

### Core Libraries

| File                          | Purpose                       |
| ----------------------------- | ----------------------------- |
| `src/lib/supabaseClient.js`   | Browser Supabase client       |
| `src/lib/categories.js`       | Enums, thresholds, FX rates   |
| `src/lib/constants.js`        | Magic numbers and config      |
| `src/lib/demoStore.js`        | In-memory demo storage        |
| `src/lib/offlineStore.js`     | IndexedDB offline storage     |
| `src/lib/syncQueue.js`        | Offline sync queue management |
| `src/lib/format.js`           | Currency/date formatting      |
| `src/lib/csv.js`              | CSV generation                |
| `src/lib/csvParserUtils.js`   | Bank CSV parsing helpers      |
| `src/lib/importUtils.js`      | Import fingerprinting         |
| `src/lib/transactionUtils.js` | Transaction helpers           |

### Contexts & Hooks

| File                             | Purpose                  |
| -------------------------------- | ------------------------ |
| `src/contexts/AuthContext.js`    | Auth state provider      |
| `src/contexts/OfflineContext.js` | Offline state and sync   |
| `src/hooks/useDemo.js`           | Demo mode hook           |
| `src/hooks/useNetworkStatus.js`  | Online/offline detection |

### Key Components

| File                                        | Purpose                       |
| ------------------------------------------- | ----------------------------- |
| `src/components/QuickAddForm.jsx`           | Transaction entry form        |
| `src/components/TransactionList.jsx`        | Transaction list orchestrator |
| `src/components/TransactionCard.jsx`        | Single transaction display    |
| `src/components/ImportPanel.jsx`            | JSON import orchestrator      |
| `src/components/ImportUpload.jsx`           | CSV upload orchestrator       |
| `src/components/NetworkStatus.jsx`          | Offline banner UI             |
| `src/components/CategoryLimitsSettings.jsx` | Category limit config         |
| `src/components/BackupSettings.jsx`         | Backup download/restore       |

### Infrastructure

| File                           | Purpose            |
| ------------------------------ | ------------------ |
| `public/sw.js`                 | Service worker     |
| `scripts/restore-backup.js`    | CLI restore script |
| `.github/workflows/backup.yml` | Automated backup   |
| `.github/workflows/ci.yml`     | CI/CD pipeline     |
| `supabase/schema.sql`          | Database schema    |
