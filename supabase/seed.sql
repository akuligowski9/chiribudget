-- =========================
-- ChiriBudget Seed Data
-- Runs automatically on `supabase db reset` after migrations.
-- Creates a realistic dataset for local development.
-- =========================

-- Disable budget rules trigger so we have full control over flagging/categories
ALTER TABLE transactions DISABLE TRIGGER trg_enforce_budget_rules;

-- -------------------------
-- Auth users (email/password login for local dev)
-- -------------------------
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated', 'authenticated',
    'testuser@example.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"TestUser"}',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated', 'authenticated',
    'testpartner@example.com',
    crypt('password123', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{"display_name":"TestPartner"}',
    ''
  )
ON CONFLICT (id) DO NOTHING;

-- Also insert into auth.identities (required for email login)
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES
  (
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '{"sub":"22222222-2222-2222-2222-222222222222","email":"testuser@example.com"}',
    'email', now(), now(), now()
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '{"sub":"33333333-3333-3333-3333-333333333333","email":"testpartner@example.com"}',
    'email', now(), now(), now()
  )
ON CONFLICT (id, provider) DO NOTHING;

-- -------------------------
-- Household
-- -------------------------
INSERT INTO households (id, name, join_code, created_at)
VALUES ('11111111-1111-1111-1111-111111111111', 'Test Household', 'SEED1234', '2025-12-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- Profiles
-- -------------------------
INSERT INTO profiles (user_id, household_id, display_name, default_currency, preferred_language, created_at)
VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'TestUser', 'USD', 'en', '2025-12-01T00:00:00Z'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'TestPartner', 'PEN', 'es', '2025-12-01T00:00:00Z')
ON CONFLICT (user_id) DO NOTHING;

-- -------------------------
-- Household members
-- -------------------------
INSERT INTO household_members (household_id, user_id, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '2025-12-01T00:00:00Z'),
  ('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '2025-12-01T00:00:00Z')
ON CONFLICT (household_id, user_id) DO NOTHING;

-- -------------------------
-- Budget config
-- -------------------------
INSERT INTO budget_config (household_id, usd_threshold, fx_usd_to_pen, category_limits, guidelines, guidelines_updated_at, guidelines_updated_by)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  500,
  3.25,
  '{"Food": {"limit": 800, "flagMode": "crossing"}, "Fixed Expenses": {"limit": 2000, "flagMode": "off"}, "Adventure": {"limit": 300, "flagMode": "all_after"}}',
  'Household budget rules:
- Flag any single expense over $500
- Food budget is $800/month
- Adventure budget is $300/month
- Discuss all flagged items before month close',
  '2025-12-15T10:00:00Z',
  '22222222-2222-2222-2222-222222222222'
)
ON CONFLICT (household_id) DO NOTHING;

-- -------------------------
-- Import batch (for linked transactions)
-- -------------------------
INSERT INTO import_batches (id, household_id, currency, month, status, source_bank, default_payer, txn_year, date_range_start, date_range_end, display_name, raw_payload, created_by, created_at, confirmed_at)
VALUES (
  '77777777-7777-7777-7777-777777777771',
  '11111111-1111-1111-1111-111111111111',
  'USD', '2026-01', 'confirmed', 'pnc', 'TestUser', 2026,
  '2026-01-02', '2026-01-15',
  'PNC Checking Jan 2026',
  '[]'::jsonb,
  '22222222-2222-2222-2222-222222222222',
  '2026-01-16T10:00:00Z',
  '2026-01-16T10:05:00Z'
)
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- Transactions: December 2025 (USD) — previous month for comparison
-- -------------------------
INSERT INTO transactions (id, household_id, txn_date, currency, amount, category, payer, description, is_flagged, flag_reason, flag_source, source, fingerprint, created_by, created_at, status) VALUES
  -- Expenses
  ('55555555-5555-5555-5555-55555555d001', '11111111-1111-1111-1111-111111111111', '2025-12-01', 'USD', -1500.00, 'Rent/Mortgages', 'Together', 'December rent', true, 'over_threshold_expense', 'threshold', 'manual', 'seed-dec25-usd-001', '22222222-2222-2222-2222-222222222222', '2025-12-01T08:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555d002', '11111111-1111-1111-1111-111111111111', '2025-12-03', 'USD', -85.50, 'Food', 'TestUser', 'Costco groceries', false, NULL, NULL, 'manual', 'seed-dec25-usd-002', '22222222-2222-2222-2222-222222222222', '2025-12-03T12:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555d003', '11111111-1111-1111-1111-111111111111', '2025-12-05', 'USD', -120.00, 'Fixed Expenses', 'Together', 'Electric bill', false, NULL, NULL, 'manual', 'seed-dec25-usd-003', '22222222-2222-2222-2222-222222222222', '2025-12-05T09:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555d004', '11111111-1111-1111-1111-111111111111', '2025-12-08', 'USD', -45.00, 'Dogs', 'TestPartner', 'Dog food and treats', false, NULL, NULL, 'manual', 'seed-dec25-usd-004', '33333333-3333-3333-3333-333333333333', '2025-12-08T14:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555d005', '11111111-1111-1111-1111-111111111111', '2025-12-12', 'USD', -200.00, 'Holidays & Birthdays', 'TestUser', 'Christmas gifts', false, NULL, NULL, 'manual', 'seed-dec25-usd-005', '22222222-2222-2222-2222-222222222222', '2025-12-12T16:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555d006', '11111111-1111-1111-1111-111111111111', '2025-12-15', 'USD', -62.30, 'Food', 'Together', 'Trader Joes', false, NULL, NULL, 'manual', 'seed-dec25-usd-006', '33333333-3333-3333-3333-333333333333', '2025-12-15T11:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555d007', '11111111-1111-1111-1111-111111111111', '2025-12-20', 'USD', -150.00, 'Adventure', 'Together', 'Weekend ski trip gas', false, NULL, NULL, 'manual', 'seed-dec25-usd-007', '22222222-2222-2222-2222-222222222222', '2025-12-20T10:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555d008', '11111111-1111-1111-1111-111111111111', '2025-12-22', 'USD', -55.00, 'Food', 'TestPartner', 'Christmas dinner ingredients', false, NULL, NULL, 'manual', 'seed-dec25-usd-008', '33333333-3333-3333-3333-333333333333', '2025-12-22T13:00:00Z', 'confirmed'),
  -- Income
  ('55555555-5555-5555-5555-55555555d009', '11111111-1111-1111-1111-111111111111', '2025-12-10', 'USD', 3000.00, 'Extra', 'TestUser', 'December paycheck', true, 'over_threshold_income', 'threshold', 'manual', 'seed-dec25-usd-009', '22222222-2222-2222-2222-222222222222', '2025-12-10T08:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555d010', '11111111-1111-1111-1111-111111111111', '2025-12-24', 'USD', 3000.00, 'Extra', 'TestUser', 'December paycheck 2', true, 'over_threshold_income', 'threshold', 'manual', 'seed-dec25-usd-010', '22222222-2222-2222-2222-222222222222', '2025-12-24T08:00:00Z', 'confirmed');

-- -------------------------
-- Transactions: December 2025 (PEN)
-- -------------------------
INSERT INTO transactions (id, household_id, txn_date, currency, amount, category, payer, description, is_flagged, flag_reason, flag_source, source, fingerprint, created_by, created_at, status) VALUES
  ('55555555-5555-5555-5555-5555555dp001', '11111111-1111-1111-1111-111111111111', '2025-12-02', 'PEN', -350.00, 'Food', 'TestPartner', 'Mercado compras', false, NULL, NULL, 'manual', 'seed-dec25-pen-001', '33333333-3333-3333-3333-333333333333', '2025-12-02T10:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555dp002', '11111111-1111-1111-1111-111111111111', '2025-12-10', 'PEN', -180.00, 'Fixed Expenses', 'TestPartner', 'Internet Movistar', false, NULL, NULL, 'manual', 'seed-dec25-pen-002', '33333333-3333-3333-3333-333333333333', '2025-12-10T09:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555dp003', '11111111-1111-1111-1111-111111111111', '2025-12-14', 'PEN', -95.00, 'Dogs', 'TestPartner', 'Veterinaria consulta', false, NULL, NULL, 'manual', 'seed-dec25-pen-003', '33333333-3333-3333-3333-333333333333', '2025-12-14T15:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555dp004', '11111111-1111-1111-1111-111111111111', '2025-12-18', 'PEN', -420.00, 'Food', 'Together', 'Cena navideña Wong', false, NULL, NULL, 'manual', 'seed-dec25-pen-004', '33333333-3333-3333-3333-333333333333', '2025-12-18T18:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555dp005', '11111111-1111-1111-1111-111111111111', '2025-12-20', 'PEN', 4500.00, 'Extra', 'TestPartner', 'Sueldo diciembre', true, 'over_threshold_income', 'threshold', 'manual', 'seed-dec25-pen-005', '33333333-3333-3333-3333-333333333333', '2025-12-20T08:00:00Z', 'confirmed');

-- -------------------------
-- Transactions: January 2026 (USD) — primary month, all categories
-- -------------------------
INSERT INTO transactions (id, household_id, txn_date, currency, amount, category, payer, description, is_flagged, flag_reason, flag_source, explanation, resolved_at, source, import_batch_id, fingerprint, recurring_fingerprint, created_by, created_at, status) VALUES
  -- Rent (flagged, with explanation — resolved)
  ('55555555-5555-5555-5555-55555555j001', '11111111-1111-1111-1111-111111111111', '2026-01-01', 'USD', -1500.00, 'Rent/Mortgages', 'Together', 'January rent', true, 'over_threshold_expense', 'threshold', 'Standard monthly rent, no concerns', '2026-01-02T10:00:00Z', 'recurring', NULL, 'recurring_66666666-6666-6666-6666-666666666661_2026-01-01', 'recurring_66666666-6666-6666-6666-666666666661_2026-01-01', '22222222-2222-2222-2222-222222222222', '2026-01-01T08:00:00Z', 'confirmed'),
  -- Food (multiple, will exceed $800 category limit)
  ('55555555-5555-5555-5555-55555555j002', '11111111-1111-1111-1111-111111111111', '2026-01-03', 'USD', -92.40, 'Food', 'TestUser', 'Costco weekly run', false, NULL, NULL, NULL, NULL, 'manual', NULL, 'seed-jan26-usd-002', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-03T12:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j003', '11111111-1111-1111-1111-111111111111', '2026-01-06', 'USD', -48.75, 'Food', 'TestPartner', 'Whole Foods', false, NULL, NULL, NULL, NULL, 'manual', NULL, 'seed-jan26-usd-003', NULL, '33333333-3333-3333-3333-333333333333', '2026-01-06T14:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j004', '11111111-1111-1111-1111-111111111111', '2026-01-10', 'USD', -110.00, 'Food', 'Together', 'Grocery haul', false, NULL, NULL, NULL, NULL, 'manual', NULL, 'seed-jan26-usd-004', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-10T11:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j005', '11111111-1111-1111-1111-111111111111', '2026-01-14', 'USD', -65.00, 'Food', 'TestUser', 'Restaurant dinner', false, NULL, NULL, NULL, NULL, 'manual', NULL, 'seed-jan26-usd-005', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-14T19:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j006', '11111111-1111-1111-1111-111111111111', '2026-01-17', 'USD', -130.00, 'Food', 'Together', 'Costco big shop', false, NULL, NULL, NULL, NULL, 'manual', NULL, 'seed-jan26-usd-006', NULL, '33333333-3333-3333-3333-333333333333', '2026-01-17T10:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j007', '11111111-1111-1111-1111-111111111111', '2026-01-21', 'USD', -78.50, 'Food', 'TestPartner', 'Lunch supplies and snacks', false, NULL, NULL, NULL, NULL, 'manual', NULL, 'seed-jan26-usd-007', NULL, '33333333-3333-3333-3333-333333333333', '2026-01-21T13:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j008', '11111111-1111-1111-1111-111111111111', '2026-01-25', 'USD', -95.00, 'Food', 'Together', 'Weekly groceries', true, 'category_limit_exceeded', 'category_limit', NULL, NULL, 'manual', NULL, 'seed-jan26-usd-008', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-25T12:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j009', '11111111-1111-1111-1111-111111111111', '2026-01-28', 'USD', -42.00, 'Food', 'TestUser', 'Coffee and pastries', true, 'category_limit_exceeded', 'category_limit', NULL, NULL, 'manual', NULL, 'seed-jan26-usd-009', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-28T08:00:00Z', 'confirmed'),
  -- Fixed expenses
  ('55555555-5555-5555-5555-55555555j010', '11111111-1111-1111-1111-111111111111', '2026-01-05', 'USD', -135.00, 'Fixed Expenses', 'Together', 'Electric and gas bill', false, NULL, NULL, NULL, NULL, 'manual', NULL, 'seed-jan26-usd-010', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-05T09:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j011', '11111111-1111-1111-1111-111111111111', '2026-01-15', 'USD', -15.99, 'Fixed Expenses', 'TestUser', 'Netflix subscription', false, NULL, NULL, NULL, NULL, 'recurring', NULL, 'recurring_66666666-6666-6666-6666-666666666662_2026-01-15', 'recurring_66666666-6666-6666-6666-666666666662_2026-01-15', '22222222-2222-2222-2222-222222222222', '2026-01-15T00:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j012', '11111111-1111-1111-1111-111111111111', '2026-01-08', 'USD', -89.99, 'Fixed Expenses', 'Together', 'Car insurance', false, NULL, NULL, NULL, NULL, 'manual', NULL, 'seed-jan26-usd-012', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-08T10:00:00Z', 'confirmed'),
  -- Dogs
  ('55555555-5555-5555-5555-55555555j013', '11111111-1111-1111-1111-111111111111', '2026-01-12', 'USD', -55.00, 'Dogs', 'TestPartner', 'Dog grooming', false, NULL, NULL, NULL, NULL, 'manual', NULL, 'seed-jan26-usd-013', NULL, '33333333-3333-3333-3333-333333333333', '2026-01-12T14:00:00Z', 'confirmed'),
  -- Adventure (will exceed $300 limit)
  ('55555555-5555-5555-5555-55555555j014', '11111111-1111-1111-1111-111111111111', '2026-01-18', 'USD', -250.00, 'Adventure', 'Together', 'Ski lift tickets', false, NULL, NULL, NULL, NULL, 'manual', NULL, 'seed-jan26-usd-014', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-18T07:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j015', '11111111-1111-1111-1111-111111111111', '2026-01-26', 'USD', -120.00, 'Adventure', 'Together', 'Hiking gear rental', true, 'category_limit_exceeded', 'category_limit', NULL, NULL, 'manual', NULL, 'seed-jan26-usd-015', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-26T09:00:00Z', 'confirmed'),
  -- Unexpected (flagged, no explanation — unresolved)
  ('55555555-5555-5555-5555-55555555j016', '11111111-1111-1111-1111-111111111111', '2026-01-20', 'USD', -620.00, 'Unexpected', 'TestUser', 'Emergency car repair', true, 'over_threshold_expense', 'threshold', NULL, NULL, 'manual', NULL, 'seed-jan26-usd-016', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-20T16:00:00Z', 'confirmed'),
  -- Income
  ('55555555-5555-5555-5555-55555555j017', '11111111-1111-1111-1111-111111111111', '2026-01-10', 'USD', 3000.00, 'Extra', 'TestUser', 'January paycheck 1', true, 'over_threshold_income', 'threshold', 'Regular biweekly salary', '2026-01-10T12:00:00Z', 'manual', NULL, 'seed-jan26-usd-017', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-10T08:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j018', '11111111-1111-1111-1111-111111111111', '2026-01-24', 'USD', 3000.00, 'Extra', 'TestUser', 'January paycheck 2', true, 'over_threshold_income', 'threshold', NULL, NULL, 'manual', NULL, 'seed-jan26-usd-018', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-24T08:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555j019', '11111111-1111-1111-1111-111111111111', '2026-01-15', 'USD', 125.00, 'Investments', 'TestUser', 'Dividend payment', false, NULL, NULL, NULL, NULL, 'manual', NULL, 'seed-jan26-usd-019', NULL, '22222222-2222-2222-2222-222222222222', '2026-01-15T10:00:00Z', 'confirmed');

-- -------------------------
-- Transactions: January 2026 (USD) — import batch linked
-- -------------------------
INSERT INTO transactions (id, household_id, txn_date, currency, amount, category, payer, description, is_flagged, flag_reason, flag_source, source, import_batch_id, fingerprint, created_by, created_at, status) VALUES
  ('55555555-5555-5555-5555-55555555ib01', '11111111-1111-1111-1111-111111111111', '2026-01-02', 'USD', -34.50, 'Food', 'TestUser', 'PNC Debit - Giant Eagle', false, NULL, NULL, 'csv', '77777777-7777-7777-7777-777777777771', 'import-pnc-jan-001', '22222222-2222-2222-2222-222222222222', '2026-01-16T10:01:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555ib02', '11111111-1111-1111-1111-111111111111', '2026-01-05', 'USD', -12.99, 'Food', 'TestUser', 'PNC Debit - Starbucks', false, NULL, NULL, 'csv', '77777777-7777-7777-7777-777777777771', 'import-pnc-jan-002', '22222222-2222-2222-2222-222222222222', '2026-01-16T10:01:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555ib03', '11111111-1111-1111-1111-111111111111', '2026-01-08', 'USD', -65.00, 'Fixed Expenses', 'TestUser', 'PNC Debit - AT&T Wireless', false, NULL, NULL, 'csv', '77777777-7777-7777-7777-777777777771', 'import-pnc-jan-003', '22222222-2222-2222-2222-222222222222', '2026-01-16T10:01:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555ib04', '11111111-1111-1111-1111-111111111111', '2026-01-10', 'USD', -172.67, 'Fixed Expenses', 'TestUser', 'PNC Debit - Credit Card Payment', false, NULL, NULL, 'csv', '77777777-7777-7777-7777-777777777771', 'import-pnc-jan-004', '22222222-2222-2222-2222-222222222222', '2026-01-16T10:01:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555ib05', '11111111-1111-1111-1111-111111111111', '2026-01-15', 'USD', -45.00, 'Dogs', 'TestUser', 'PNC Debit - PetSmart', false, NULL, NULL, 'csv', '77777777-7777-7777-7777-777777777771', 'import-pnc-jan-005', '22222222-2222-2222-2222-222222222222', '2026-01-16T10:01:00Z', 'confirmed');

-- -------------------------
-- Transactions: January 2026 (USD) — duplicate-flagged pair
-- -------------------------
INSERT INTO transactions (id, household_id, txn_date, currency, amount, category, payer, description, is_flagged, flag_reason, flag_source, source, fingerprint, created_by, created_at, status) VALUES
  ('55555555-5555-5555-5555-55555555du01', '11111111-1111-1111-1111-111111111111', '2026-01-10', 'USD', -172.67, 'Fixed Expenses', 'TestUser', 'Credit card payment', true, 'possible_duplicate', 'import', 'manual', 'seed-jan26-dup-001', '22222222-2222-2222-2222-222222222222', '2026-01-10T10:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555du02', '11111111-1111-1111-1111-111111111111', '2026-01-10', 'USD', -172.67, 'Fixed Expenses', 'TestUser', 'Credit card payment', true, 'possible_duplicate', 'import', 'manual', 'seed-jan26-dup-001_dup2', '22222222-2222-2222-2222-222222222222', '2026-01-10T10:00:00Z', 'confirmed');

-- -------------------------
-- Transactions: January 2026 (PEN)
-- -------------------------
INSERT INTO transactions (id, household_id, txn_date, currency, amount, category, payer, description, is_flagged, flag_reason, flag_source, source, fingerprint, created_by, created_at, status) VALUES
  ('55555555-5555-5555-5555-5555555jp001', '11111111-1111-1111-1111-111111111111', '2026-01-02', 'PEN', -280.00, 'Food', 'TestPartner', 'Supermercado Wong', false, NULL, NULL, 'manual', 'seed-jan26-pen-001', '33333333-3333-3333-3333-333333333333', '2026-01-02T10:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555jp002', '11111111-1111-1111-1111-111111111111', '2026-01-05', 'PEN', -120.00, 'Fixed Expenses', 'TestPartner', 'Internet Movistar enero', false, NULL, NULL, 'recurring', 'recurring_66666666-6666-6666-6666-666666666664_2026-01-05', 'recurring_66666666-6666-6666-6666-666666666664_2026-01-05', '33333333-3333-3333-3333-333333333333', '2026-01-05T09:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555jp003', '11111111-1111-1111-1111-111111111111', '2026-01-09', 'PEN', -65.00, 'Dogs', 'TestPartner', 'Comida para perros', false, NULL, NULL, 'manual', 'seed-jan26-pen-003', '33333333-3333-3333-3333-333333333333', '2026-01-09T15:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555jp004', '11111111-1111-1111-1111-111111111111', '2026-01-13', 'PEN', -450.00, 'Food', 'Together', 'Mercado y frutas', false, NULL, NULL, 'manual', 'seed-jan26-pen-004', '33333333-3333-3333-3333-333333333333', '2026-01-13T11:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555jp005', '11111111-1111-1111-1111-111111111111', '2026-01-16', 'PEN', -180.00, 'Adventure', 'Together', 'Paseo a Lunahuaná', false, NULL, NULL, 'manual', 'seed-jan26-pen-005', '33333333-3333-3333-3333-333333333333', '2026-01-16T08:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555jp006', '11111111-1111-1111-1111-111111111111', '2026-01-20', 'PEN', 4500.00, 'Extra', 'TestPartner', 'Sueldo enero', true, 'over_threshold_income', 'threshold', 'manual', 'seed-jan26-pen-006', '33333333-3333-3333-3333-333333333333', '2026-01-20T08:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555jp007', '11111111-1111-1111-1111-111111111111', '2026-01-24', 'PEN', -320.00, 'Food', 'TestPartner', 'Restaurante familiar', false, NULL, NULL, 'manual', 'seed-jan26-pen-007', '33333333-3333-3333-3333-333333333333', '2026-01-24T19:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555jp008', '11111111-1111-1111-1111-111111111111', '2026-01-28', 'PEN', 250.00, 'Investments', 'TestPartner', 'Dividendos BVL', false, NULL, NULL, 'manual', 'seed-jan26-pen-008', '33333333-3333-3333-3333-333333333333', '2026-01-28T10:00:00Z', 'confirmed');

-- -------------------------
-- Transactions: February 2026 (USD) — current month, partial
-- -------------------------
INSERT INTO transactions (id, household_id, txn_date, currency, amount, category, payer, description, is_flagged, flag_reason, flag_source, source, fingerprint, recurring_fingerprint, created_by, created_at, status) VALUES
  ('55555555-5555-5555-5555-55555555f001', '11111111-1111-1111-1111-111111111111', '2026-02-01', 'USD', -1500.00, 'Rent/Mortgages', 'Together', 'February rent', true, 'over_threshold_expense', 'threshold', 'recurring', 'recurring_66666666-6666-6666-6666-666666666661_2026-02-01', 'recurring_66666666-6666-6666-6666-666666666661_2026-02-01', '22222222-2222-2222-2222-222222222222', '2026-02-01T08:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555f002', '11111111-1111-1111-1111-111111111111', '2026-02-02', 'USD', -78.00, 'Food', 'TestUser', 'Costco run', false, NULL, NULL, 'manual', 'seed-feb26-usd-002', NULL, '22222222-2222-2222-2222-222222222222', '2026-02-02T12:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555f003', '11111111-1111-1111-1111-111111111111', '2026-02-03', 'USD', -140.00, 'Fixed Expenses', 'Together', 'Electric and gas', false, NULL, NULL, 'manual', 'seed-feb26-usd-003', NULL, '22222222-2222-2222-2222-222222222222', '2026-02-03T09:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555f004', '11111111-1111-1111-1111-111111111111', '2026-02-04', 'USD', -35.00, 'Food', 'TestPartner', 'Lunch supplies', false, NULL, NULL, 'manual', 'seed-feb26-usd-004', NULL, '33333333-3333-3333-3333-333333333333', '2026-02-04T13:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555f005', '11111111-1111-1111-1111-111111111111', '2026-02-05', 'USD', -50.00, 'Dogs', 'TestPartner', 'Dog food Chewy', false, NULL, NULL, 'manual', 'seed-feb26-usd-005', NULL, '33333333-3333-3333-3333-333333333333', '2026-02-05T14:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555f006', '11111111-1111-1111-1111-111111111111', '2026-02-06', 'USD', -22.50, 'Food', 'TestUser', 'Coffee shop', false, NULL, NULL, 'manual', 'seed-feb26-usd-006', NULL, '22222222-2222-2222-2222-222222222222', '2026-02-06T08:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-55555555f007', '11111111-1111-1111-1111-111111111111', '2026-02-07', 'USD', 3000.00, 'Extra', 'TestUser', 'February paycheck', true, 'over_threshold_income', 'threshold', 'manual', 'seed-feb26-usd-007', NULL, '22222222-2222-2222-2222-222222222222', '2026-02-07T08:00:00Z', 'confirmed');

-- -------------------------
-- Transactions: February 2026 (PEN)
-- -------------------------
INSERT INTO transactions (id, household_id, txn_date, currency, amount, category, payer, description, is_flagged, source, fingerprint, created_by, created_at, status) VALUES
  ('55555555-5555-5555-5555-5555555fp001', '11111111-1111-1111-1111-111111111111', '2026-02-02', 'PEN', -310.00, 'Food', 'TestPartner', 'Compras semanales', false, 'manual', 'seed-feb26-pen-001', '33333333-3333-3333-3333-333333333333', '2026-02-02T10:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555fp002', '11111111-1111-1111-1111-111111111111', '2026-02-05', 'PEN', -120.00, 'Fixed Expenses', 'TestPartner', 'Internet Movistar febrero', false, 'recurring', 'recurring_66666666-6666-6666-6666-666666666664_2026-02-05', '33333333-3333-3333-3333-333333333333', '2026-02-05T09:00:00Z', 'confirmed'),
  ('55555555-5555-5555-5555-5555555fp003', '11111111-1111-1111-1111-111111111111', '2026-02-06', 'PEN', -85.00, 'Food', 'Together', 'Pan y cafe', false, 'manual', 'seed-feb26-pen-003', '33333333-3333-3333-3333-333333333333', '2026-02-06T08:00:00Z', 'confirmed');

-- -------------------------
-- Soft-deleted transactions (visible in Trash view)
-- -------------------------
INSERT INTO transactions (id, household_id, txn_date, currency, amount, category, payer, description, is_flagged, source, fingerprint, created_by, created_at, status, deleted_at, deleted_by) VALUES
  ('55555555-5555-5555-5555-555555trash1', '11111111-1111-1111-1111-111111111111', '2026-01-22', 'USD', -25.00, 'Food', 'TestUser', 'Vending machine (accidental entry)', false, 'manual', 'seed-trash-001', '22222222-2222-2222-2222-222222222222', '2026-01-22T15:00:00Z', 'confirmed', '2026-01-22T15:05:00Z', '22222222-2222-2222-2222-222222222222'),
  ('55555555-5555-5555-5555-555555trash2', '11111111-1111-1111-1111-111111111111', '2026-01-19', 'USD', -300.00, 'Unexpected', 'TestPartner', 'Duplicate entry - ignore', false, 'manual', 'seed-trash-002', '33333333-3333-3333-3333-333333333333', '2026-01-19T10:00:00Z', 'confirmed', '2026-01-20T09:00:00Z', '33333333-3333-3333-3333-333333333333');

-- -------------------------
-- Recurring transactions
-- -------------------------
INSERT INTO recurring_transactions (id, household_id, amount, currency, category, payer, description, frequency, start_date, end_date, day_of_month, day_of_week, is_active, created_by, created_at) VALUES
  ('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', -1500.00, 'USD', 'Rent/Mortgages', 'Together', 'Monthly rent', 'monthly', '2025-12-01', NULL, 1, NULL, true, '22222222-2222-2222-2222-222222222222', '2025-12-01T00:00:00Z'),
  ('66666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', -15.99, 'USD', 'Fixed Expenses', 'TestUser', 'Netflix subscription', 'monthly', '2025-12-15', NULL, 15, NULL, true, '22222222-2222-2222-2222-222222222222', '2025-12-01T00:00:00Z'),
  ('66666666-6666-6666-6666-666666666663', '11111111-1111-1111-1111-111111111111', 3000.00, 'USD', 'Salary', 'TestUser', 'Biweekly paycheck', 'biweekly', '2025-12-05', NULL, NULL, 5, true, '22222222-2222-2222-2222-222222222222', '2025-12-01T00:00:00Z'),
  ('66666666-6666-6666-6666-666666666664', '11111111-1111-1111-1111-111111111111', -120.00, 'PEN', 'Fixed Expenses', 'TestPartner', 'Internet Movistar', 'monthly', '2025-12-05', NULL, 5, NULL, true, '33333333-3333-3333-3333-333333333333', '2025-12-01T00:00:00Z'),
  ('66666666-6666-6666-6666-666666666665', '11111111-1111-1111-1111-111111111111', -50.00, 'USD', 'Fixed Expenses', 'TestUser', 'Gym membership', 'monthly', '2025-12-15', NULL, 15, NULL, true, '22222222-2222-2222-2222-222222222222', '2025-12-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- -------------------------
-- Recurring exceptions
-- -------------------------
INSERT INTO recurring_exceptions (id, recurring_id, occurrence_date, exception_type, created_by, created_at) VALUES
  ('88888888-8888-8888-8888-888888888881', '66666666-6666-6666-6666-666666666665', '2026-01-15', 'skip', '22222222-2222-2222-2222-222222222222', '2026-01-14T10:00:00Z'),
  ('88888888-8888-8888-8888-888888888882', '66666666-6666-6666-6666-666666666665', '2026-02-15', 'skip', '22222222-2222-2222-2222-222222222222', '2026-02-10T10:00:00Z')
ON CONFLICT (recurring_id, occurrence_date) DO NOTHING;

-- -------------------------
-- Month status
-- -------------------------
INSERT INTO month_status (id, household_id, month, currency, status, discussion_notes, discussed_at, discussed_by) VALUES
  ('99999999-9999-9999-9999-999999999901', '11111111-1111-1111-1111-111111111111', '2025-12', 'USD', 'discussed', 'December was a heavy spending month due to holidays. Agreed the Christmas gifts were reasonable. Ski trip was a one-time splurge.', '2026-01-05T20:00:00Z', '22222222-2222-2222-2222-222222222222'),
  ('99999999-9999-9999-9999-999999999902', '11111111-1111-1111-1111-111111111111', '2025-12', 'PEN', 'discussed', 'Gastos de diciembre normales. Cena navideña fue un poco alta pero aceptable.', '2026-01-05T20:15:00Z', '33333333-3333-3333-3333-333333333333'),
  ('99999999-9999-9999-9999-999999999903', '11111111-1111-1111-1111-111111111111', '2026-01', 'USD', 'draft', NULL, NULL, NULL),
  ('99999999-9999-9999-9999-999999999904', '11111111-1111-1111-1111-111111111111', '2026-01', 'PEN', 'draft', NULL, NULL, NULL)
ON CONFLICT (household_id, month, currency) DO NOTHING;

-- Re-enable budget rules trigger
ALTER TABLE transactions ENABLE TRIGGER trg_enforce_budget_rules;

-- -------------------------
-- Done! Seed data loaded.
-- Login: testuser@example.com / password123
-- Login: testpartner@example.com / password123
-- -------------------------
