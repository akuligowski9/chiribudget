# ChiriBudget - Development Notes

## Resume Point (Jan 12, 2026)

### Just Completed

- Constants file for magic numbers (`src/lib/constants.js`)
- Description validation (200 char max with counter)
- Loading skeletons for TodayTransactions & TransactionList

### Next Up (No Supabase Needed)

1. Demo mode - improve sample data in `demo/transactions.json`
2. Add skeletons to remaining components (BudgetSettings, ProfileSettings, Guidelines)
3. Delete confirmation dialogs
4. More test coverage (QuickAddForm validation)

### When Ready for Supabase (~15 min)

- Schema ready in `supabase/schema.sql`
- Setup guide in README.md
- Steps: Create project, run schema, add env vars to `.env.local`

## Commands

```bash
npm run dev           # Start dev server
npm test              # Run tests
npm run build         # Production build
```
