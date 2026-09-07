-- Finora personal finance schema
-- Run this in the Supabase SQL editor or via the Supabase CLI.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- Always stamp user_id from the authenticated session. Never trust client input.
create or replace function public.set_auth_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.validate_owned_relations()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'transactions' then
    if not exists (
      select 1 from public.accounts
      where id = new.account_id and user_id = new.user_id
    ) then
      raise exception 'Account does not belong to the current user';
    end if;

    if not exists (
      select 1 from public.categories
      where id = new.category_id and user_id = new.user_id and type = new.type
    ) then
      raise exception 'Category does not belong to the current user or type mismatch';
    end if;
  end if;

  if tg_table_name = 'budgets' then
    if not exists (
      select 1 from public.categories
      where id = new.category_id and user_id = new.user_id and type = 'expense'
    ) then
      raise exception 'Budget category must be an expense category you own';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.sync_account_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_delta numeric(14, 2);
  new_delta numeric(14, 2);
begin
  if tg_op = 'INSERT' then
    new_delta := case when new.type = 'income' then new.amount else -new.amount end;
    update public.accounts
      set balance = balance + new_delta
      where id = new.account_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    old_delta := case when old.type = 'income' then old.amount else -old.amount end;
    update public.accounts
      set balance = balance - old_delta
      where id = old.account_id;
    return old;
  end if;

  old_delta := case when old.type = 'income' then old.amount else -old.amount end;
  new_delta := case when new.type = 'income' then new.amount else -new.amount end;

  update public.accounts
    set balance = balance - old_delta
    where id = old.account_id;

  update public.accounts
    set balance = balance + new_delta
    where id = new.account_id;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  icon text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint categories_name_type_unique unique (user_id, name, type)
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'bank', 'card', 'wallet')),
  balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint accounts_name_unique unique (user_id, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id) on delete restrict,
  category_id uuid not null references public.categories (id) on delete restrict,
  type text not null check (type in ('income', 'expense')),
  title text not null,
  amount numeric(14, 2) not null check (amount > 0),
  description text,
  transaction_date date not null default current_date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  month integer not null check (month between 1 and 12),
  year integer not null check (year between 2000 and 2100),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint budgets_unique_period unique (user_id, category_id, month, year)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists idx_categories_user_id on public.categories (user_id);
create index if not exists idx_categories_user_type on public.categories (user_id, type);
create index if not exists idx_accounts_user_id on public.accounts (user_id);
create index if not exists idx_transactions_user_id on public.transactions (user_id);
create index if not exists idx_transactions_user_date on public.transactions (user_id, transaction_date desc);
create index if not exists idx_transactions_user_type on public.transactions (user_id, type);
create index if not exists idx_transactions_account_id on public.transactions (account_id);
create index if not exists idx_transactions_category_id on public.transactions (category_id);
create index if not exists idx_budgets_user_period on public.budgets (user_id, year, month);
create index if not exists idx_budgets_category_id on public.budgets (category_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists budgets_set_updated_at on public.budgets;
create trigger budgets_set_updated_at
before update on public.budgets
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_user_id on public.categories;
create trigger categories_set_user_id
before insert on public.categories
for each row execute function public.set_auth_user_id();

drop trigger if exists accounts_set_user_id on public.accounts;
create trigger accounts_set_user_id
before insert on public.accounts
for each row execute function public.set_auth_user_id();

drop trigger if exists transactions_set_user_id on public.transactions;
create trigger transactions_set_user_id
before insert on public.transactions
for each row execute function public.set_auth_user_id();

drop trigger if exists budgets_set_user_id on public.budgets;
create trigger budgets_set_user_id
before insert on public.budgets
for each row execute function public.set_auth_user_id();

drop trigger if exists transactions_validate_relations on public.transactions;
create trigger transactions_validate_relations
before insert or update on public.transactions
for each row execute function public.validate_owned_relations();

drop trigger if exists budgets_validate_relations on public.budgets;
create trigger budgets_validate_relations
before insert or update on public.budgets
for each row execute function public.validate_owned_relations();

drop trigger if exists transactions_sync_account_balance on public.transactions;
create trigger transactions_sync_account_balance
after insert or update or delete on public.transactions
for each row execute function public.sync_account_balance();

-- ---------------------------------------------------------------------------
-- New user bootstrap: profile, default categories, default cash account
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    new.email
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);

  insert into public.categories (user_id, name, type, icon)
  values
    (new.id, 'Salary', 'income', '↗'),
    (new.id, 'Freelance', 'income', '⌁'),
    (new.id, 'Investment', 'income', '◈'),
    (new.id, 'Gift', 'income', '✦'),
    (new.id, 'Other Income', 'income', '◉'),
    (new.id, 'Food', 'expense', '🛒'),
    (new.id, 'Transport', 'expense', '▣'),
    (new.id, 'Bills', 'expense', 'ϟ'),
    (new.id, 'Entertainment', 'expense', '▶'),
    (new.id, 'Shopping', 'expense', '▤'),
    (new.id, 'Other', 'expense', '◎')
  on conflict do nothing;

  insert into public.accounts (user_id, name, type, balance)
  values (new.id, 'Cash', 'cash', 0)
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

-- Profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Categories
drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own"
on public.categories for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own"
on public.categories for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own"
on public.categories for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own"
on public.categories for delete
to authenticated
using (user_id = auth.uid());

-- Accounts
drop policy if exists "accounts_select_own" on public.accounts;
create policy "accounts_select_own"
on public.accounts for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "accounts_insert_own" on public.accounts;
create policy "accounts_insert_own"
on public.accounts for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "accounts_update_own" on public.accounts;
create policy "accounts_update_own"
on public.accounts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "accounts_delete_own" on public.accounts;
create policy "accounts_delete_own"
on public.accounts for delete
to authenticated
using (user_id = auth.uid());

-- Transactions
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
on public.transactions for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
on public.transactions for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
on public.transactions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
on public.transactions for delete
to authenticated
using (user_id = auth.uid());

-- Budgets
drop policy if exists "budgets_select_own" on public.budgets;
create policy "budgets_select_own"
on public.budgets for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "budgets_insert_own" on public.budgets;
create policy "budgets_insert_own"
on public.budgets for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "budgets_update_own" on public.budgets;
create policy "budgets_update_own"
on public.budgets for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "budgets_delete_own" on public.budgets;
create policy "budgets_delete_own"
on public.budgets for delete
to authenticated
using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (RLS still applies)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.accounts to authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.budgets to authenticated;
