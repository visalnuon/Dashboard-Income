# Visal Income & Expense Dashboard

A polished React + TypeScript + Vite dashboard UI for personal income and expense tracking.

## Run

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Included

- Responsive finance dashboard
- Dark/light theme toggle
- Income, expense, category, budget, and account navigation
- Summary cards
- SVG income vs expense chart
- SVG expense breakdown donut
- Recent transaction table
- Search/filter transactions
- Add transaction modal
- Clean structure ready for Supabase integration

## Next step: Supabase

The current version uses demo data so it works immediately. Connect Supabase by adding:
- `@supabase/supabase-js`
- authentication
- PostgreSQL tables for profiles, income, expenses, categories, accounts, budgets
- Row Level Security policies
- service/data functions

The UI can then be wired to real user data without changing the overall layout.
