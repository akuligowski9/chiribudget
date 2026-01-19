# ChiriBudget Roadmap

High-level narrative plan for ChiriBudget development. For detailed task tracking, see [BACKLOG.md](./BACKLOG.md).

---

## Now

Current focus areas for active development.

### Bank CSV Import Support

Enable importing transaction data directly from bank CSV exports. This removes the need to manually format JSON and makes the import workflow practical for regular use.

- Support multiple bank formats (BCP, Interbank, etc.)
- Auto-detect bank from CSV structure
- Map bank columns to transaction fields
- Reference: User providing bank CSV examples

### Polish & Bug Fixes

Address any issues discovered during regular use.

- Monitor for edge cases in dynamic payer logic
- Ensure import batch workflow is intuitive
- Fix any demo mode sync issues

---

## Next

Items planned for near-term implementation after current work.

### Error Monitoring (CB-013)

Add Sentry for production error tracking. Helps catch issues before users report them.

- Free tier sufficient for app scale
- No PII in error reports
- Source maps for readable stack traces

### Component Refactoring (CB-019)

Extract large components into smaller, focused pieces. `ImportPanel.jsx` is 330+ lines.

- Split into `ImportFileUpload`, `ImportPreview`, `ImportConfirm`
- Target: No component over 200 lines
- Improves maintainability and testability

### Offline Support (CB-016)

Basic offline capability for the PWA.

- Cache recent transactions for offline viewing
- Queue new transactions for sync when online
- Clear offline indicator

---

## Later

Future enhancements for v2 and beyond.

### TypeScript Migration (CB-027)

Convert codebase from JavaScript to TypeScript for improved type safety and IDE support.

- Significant effort (40+ files)
- Can be done incrementally
- Generate Supabase types from schema

### Privacy-Respecting Analytics (CB-028)

Add basic usage analytics without tracking PII.

- Options: Plausible, Umami, or custom
- Metrics: active users, transactions/month, feature usage
- User opt-out required

### Auto-Translate Descriptions (CB-030)

Optionally translate transaction descriptions based on language preference.

- Requires translation API (costs per request)
- Cache translations to reduce API calls
- Low priority — both users likely bilingual

---

## Completed Milestones

### v1 Launch (January 2026)

- Core budgeting functionality
- Multi-currency support (USD/PEN)
- Auto-flagging for large transactions
- Spanish language support
- Household member management
- Soft deletes with 30-day recovery
- E2E test coverage
- Security headers and accessibility
- CI/CD with GitHub Actions

### Demo Mode

- Portfolio-ready showcase
- No authentication required
- Sample data included
- All features functional (non-persistent)
