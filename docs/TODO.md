# ChiriBudget TODO

This document tracks planned work for the ChiriBudget application.

---

## Frontend

### High Priority

- [x] Add error boundaries to catch React render errors gracefully
- [ ] Add form validation (required fields, future dates, amount limits)
- [ ] Add ARIA labels and semantic HTML for accessibility
- [ ] Add visible focus indicators for keyboard navigation

### Medium Priority

- [ ] Create Budget Settings UI to edit thresholds per household (DB table exists, no UI)
- [ ] Add transaction list/history view (can add transactions but can't browse/edit them)
- [ ] Add household member management UI (view/remove members)
- [ ] Improve "Mark Discussed" blocking UX when flagged items unresolved
- [ ] Test and fix mobile responsiveness on small screens (<360px)

### Low Priority

- [ ] Extract large components into smaller sub-components (ImportPanel is 330+ lines)
- [ ] Add loading states and skeleton UI

---

## Backend

### High Priority

- [ ] Add composite database indexes on `(household_id, currency, txn_date)` for query performance
- [ ] Add server-side validation for critical fields (amount, category, payer enums)

### Medium Priority

- [ ] Implement batch insert with transaction rollback for imports (currently row-by-row)
- [ ] Add `created_by`/`updated_by` audit columns to `household_members` and `month_status`
- [ ] Document or remove unused `rejected` enum value in `import_status_t`

### Low Priority

- [ ] Add soft deletes (`deleted_at`) for transaction recovery/audit trail
- [ ] Consider rate limiting for import endpoint

---

## Deployment

### High Priority

- [x] Create `.env.example` documenting required environment variables
- [x] Add GitHub Actions workflow for lint + build on PRs
- [x] Add husky + lint-staged for pre-commit checks

### Medium Priority

- [ ] Add auto-deploy workflow to Vercel on main branch push
- [ ] Add error monitoring (Sentry free tier)
- [ ] Document Vercel + Supabase setup steps in README

### Low Priority

- [ ] Add CSP headers configuration
- [ ] Document database backup/restore procedures

---

## Other

### High Priority

- [ ] Add test suite:
  - [ ] Unit tests for utilities (`format.js`, `csv.js`, `categories.js`)
  - [ ] Component tests with React Testing Library
  - [ ] E2E tests with Playwright for critical flows
- [ ] Add `eslint-plugin-jsx-a11y` for accessibility linting

### Medium Priority

- [ ] Add deployment documentation to README
- [ ] Create constants file for magic numbers (toast timeout, spacing values)
- [ ] Add import sorting ESLint plugin

### Low Priority (v2)

- [ ] Migrate to TypeScript (Supabase has type generation)
- [ ] Add service worker for offline support
- [ ] Add privacy-respecting analytics (Plausible/Fathom)

---

## Implementation Notes

### Current Strengths

- Clean RLS-based security model
- Thoughtful deduplication strategy (fingerprinting)
- Demo mode for portfolio presentation
- Sensible component hierarchy
- Good use of React hooks and state management

### Areas for Improvement

- No comprehensive error handling
- Accessibility not prioritized
- No test coverage
- Documentation assumes developer knowledge of Supabase
- No production monitoring

---

## Quick Reference

| Category   | High | Medium | Low |
| ---------- | ---- | ------ | --- |
| Frontend   | 3    | 5      | 2   |
| Backend    | 2    | 3      | 2   |
| Deployment | 0    | 3      | 2   |
| Other      | 2    | 3      | 3   |
