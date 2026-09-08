# Visal Income & Expense Dashboard

A polished React + TypeScript + Vite dashboard UI for personal income and expense tracking.

## Run

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Cloud sharing (users + money on every device)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/migrations/20260908120000_app_users.sql` (run the whole file once).
3. Copy `.env.example` to `.env` and add:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

4. Restart `npm run dev`. On Vercel, add the same two values, then redeploy.
5. Sign out and sign in as `admin` / `admin 123`.

After that:

- Anyone who taps **Create user** on any phone is saved in the cloud.
- Admin sees every account in **Settings**.
- Each person’s income, expenses, accounts, budgets, and categories follow them to every device.

Without those keys, the app still works on this browser only.
