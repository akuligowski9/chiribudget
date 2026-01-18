# ChiriBudget - Development Notes

## Resume Point (Jan 18, 2026)

### Just Completed

- Auth system with AuthContext, useDemo hook, LoginScreen
- ConfirmDialog component (replaces window.confirm)
- Loading skeletons for all components
- Demo data expanded to 41 transactions (USD + PEN)
- PWA icons fixed (were empty)
- Deprecated meta tag fixed

### Next Up (No Supabase Needed)

1. More test coverage (QuickAddForm validation)
2. Discussion page improvements
3. CSV export enhancements

### When Ready for Supabase (~15 min)

- Schema ready in `supabase/schema.sql`
- Setup guide in README.md
- Steps: Create project, run schema, add env vars to `.env.local`

## Commands

```bash
npm run dev           # Start dev server
npm test              # Run tests
npm run build         # Production build
npm run lint          # Run ESLint
```
