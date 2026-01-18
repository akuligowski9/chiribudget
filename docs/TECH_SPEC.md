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
- Offline-first functionality

---

## 2. Architecture

### 2.1 Tech Stack

| Layer    | Technology              | Purpose                              |
| -------- | ----------------------- | ------------------------------------ |
| Frontend | Next.js 16 (App Router) | SSR, routing, React 18               |
| UI       | Tailwind CSS + Radix UI | Styling, accessible primitives       |
| Backend  | Supabase (PostgreSQL)   | Database, Auth, RLS                  |
| Hosting  | Vercel                  | Edge deployment, CDN                 |
| PWA      | next-pwa                | Installable app (no offline support) |

### 2.2 Directory Structure

```
src/
├── app/                    # Next.js App Router
│   ├── page.js            # Home (transaction entry)
│   ├── dashboard/         # Analytics & review
│   ├── layout.js          # Root layout with providers
│   └── globals.css        # Global styles
├── components/            # React components ("use client")
│   ├── ui/               # Reusable UI primitives
│   ├── QuickAddForm.jsx  # Transaction entry form
│   ├── TransactionList.jsx
│   ├── ImportPanel.jsx
│   └── ...
├── contexts/             # React Context providers
│   └── AuthContext.js    # Authentication state
├── hooks/                # Custom React hooks
│   └── useDemo.js        # Demo mode detection
└── lib/                  # Utilities & business logic
    ├── supabaseClient.js # Supabase browser client
    ├── categories.js     # Enums and constants
    ├── demoStore.js      # In-memory demo storage
    ├── format.js         # Number/date formatting
    ├── csv.js            # CSV generation
    └── constants.js      # Magic numbers
```

### 2.3 Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Supabase  │────▶│  PostgreSQL │
│  (Next.js)  │◀────│    Auth     │◀────│    + RLS    │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  Demo Mode  │  (localStorage flag → in-memory store)
└─────────────┘
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

### 5.2 Import Preview

**Purpose**: Bulk import with verification before commit

**Flow**:

1. User pastes JSON array of transactions
2. Client parses and validates structure
3. Preview shows: count, total, duplicates detected
4. User confirms
5. Transactions inserted with `source: 'import'`

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

### 5.3 Dashboard

**Purpose**: Monthly review and accountability

**Components**:

- Month/currency selector
- Category breakdown (pie/bar charts)
- Net by payer (alex, adriana, together)
- Flagged transactions list
- Discussion notes editor
- "Mark Discussed" button (blocked if unresolved flags)

### 5.4 Auto-Flagging

**Purpose**: Surface large transactions for discussion

**Rules** (enforced by database trigger):

- Expense > threshold → category = 'Unexpected', is_flagged = true
- Income > threshold → category = 'Extra', is_flagged = true

**Default Thresholds**:

- USD: $500
- PEN: 1625 (500 \* 3.25 FX rate)

### 5.5 Demo Mode

**Purpose**: Portfolio showcase without real data

**Detection**: `localStorage.getItem('chiribudget_demo') === 'true'`

**Behavior**:

- All Supabase calls bypassed
- Uses `demo/transactions.json` (41 sample transactions)
- Import preview works but doesn't persist
- No authentication required

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

## 10. Future Considerations

### 10.1 Planned Enhancements

- E2E tests with Playwright
- Server-side validation for enums
- Batch import with transaction rollback
- Household member management UI
- Error monitoring (Sentry)

### 10.2 Documented Gaps (Acceptable for v1)

- No rate limiting (low risk for 2-person app)
- No two-factor auth (magic link sufficient)
- No offline support (requires internet)

---

## Appendix A: File Reference

| File                          | Purpose                     |
| ----------------------------- | --------------------------- |
| `src/lib/supabaseClient.js`   | Browser Supabase client     |
| `src/lib/categories.js`       | Enums, thresholds, FX rates |
| `src/lib/demoStore.js`        | In-memory demo storage      |
| `src/lib/format.js`           | Currency/date formatting    |
| `src/lib/csv.js`              | CSV generation              |
| `src/contexts/AuthContext.js` | Auth state provider         |
| `src/hooks/useDemo.js`        | Demo mode hook              |
| `supabase/schema.sql`         | Complete database schema    |
