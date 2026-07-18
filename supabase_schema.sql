-- ============================================================
-- FinanceMe — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── ACCOUNTS ──────────────────────────────────────────────────
create table if not exists accounts (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  type        text not null check (type in ('cash', 'bank', 'ewallet', 'investment')),
  balance     numeric(15, 2) not null default 0,
  color       text default '#6366f1',
  icon        text default 'bank',
  created_at  timestamptz default now()
);

-- ── CATEGORIES ────────────────────────────────────────────────
create table if not exists categories (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  type        text not null check (type in ('income', 'expense')),
  icon        text default 'other_expense',
  color       text default '#6b7280',
  created_at  timestamptz default now()
);

-- ── TRANSACTIONS ──────────────────────────────────────────────
create table if not exists transactions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  account_id  uuid references accounts(id) on delete cascade not null,
  category_id uuid references categories(id) on delete set null,
  type        text not null check (type in ('income', 'expense', 'transfer')),
  amount      numeric(15, 2) not null check (amount > 0),
  description text,
  date        date not null default current_date,
  created_at  timestamptz default now()
);

-- ── BUDGETS ───────────────────────────────────────────────────
create table if not exists budgets (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  amount      numeric(15, 2) not null check (amount > 0),
  month       char(7) not null, -- Format: YYYY-MM
  created_at  timestamptz default now(),
  unique(user_id, category_id, month)
);

-- ── GOALS ───────────────────────────────────────────────────────
create table if not exists goals (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  target_amount numeric(15, 2) not null check (target_amount > 0),
  current_amount numeric(15, 2) not null default 0,
  deadline    date,
  color       text default '#0ea5e9',
  icon        text default 'target',
  created_at  timestamptz default now()
);

-- ── RECURRING BILLS ───────────────────────────────────────────────
create table if not exists recurring_bills (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  amount      numeric(15, 2) not null check (amount > 0),
  due_date    integer not null check (due_date between 1 and 31),
  category_id uuid references categories(id) on delete set null,
  account_id  uuid references accounts(id) on delete set null,
  created_at  timestamptz default now()
);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
alter table accounts    enable row level security;
alter table categories  enable row level security;
alter table transactions enable row level security;
alter table budgets     enable row level security;
alter table goals       enable row level security;
alter table recurring_bills enable row level security;

-- Policies: users can only see/modify their own data
create policy "users own accounts"    on accounts    for all using (auth.uid() = user_id);
create policy "users own categories"  on categories  for all using (auth.uid() = user_id);
create policy "users own transactions" on transactions for all using (auth.uid() = user_id);
create policy "users own budgets"     on budgets     for all using (auth.uid() = user_id);
create policy "users own goals"       on goals       for all using (auth.uid() = user_id);
create policy "users own recurring"   on recurring_bills for all using (auth.uid() = user_id);

-- ── FUNCTION: Update Account Balance ──────────────────────────
create or replace function update_account_balance(account_id uuid, delta numeric)
returns void as $$
begin
  update accounts set balance = balance + delta where id = account_id;
end;
$$ language plpgsql security definer;

-- ── INDEXES ───────────────────────────────────────────────────
create index if not exists idx_transactions_user_date  on transactions(user_id, date desc);
create index if not exists idx_transactions_account    on transactions(account_id);
create index if not exists idx_transactions_category   on transactions(category_id);
create index if not exists idx_budgets_user_month      on budgets(user_id, month);

-- ── SEED DEFAULT CATEGORIES ──────────────────────────────────
-- This function creates default categories for a new user
create or replace function public.create_default_categories(p_user_id uuid)
returns void as $$
begin
  insert into public.categories (user_id, name, type, icon, color) values
    (p_user_id, 'Gaji',              'income',  'salary',        '#10b981'),
    (p_user_id, 'Freelance',         'income',  'other_income',  '#06b6d4'),
    (p_user_id, 'Investasi',         'income',  'investment',    '#8b5cf6'),
    (p_user_id, 'Lainnya',           'income',  'other_income',  '#f59e0b'),
    (p_user_id, 'Makanan & Minuman', 'expense', 'food',          '#f97316'),
    (p_user_id, 'Transportasi',      'expense', 'transport',     '#3b82f6'),
    (p_user_id, 'Belanja',           'expense', 'shopping',      '#ec4899'),
    (p_user_id, 'Tagihan & Utilitas','expense', 'bills',         '#ef4444'),
    (p_user_id, 'Hiburan',           'expense', 'entertainment', '#a855f7'),
    (p_user_id, 'Kesehatan',         'expense', 'health',        '#14b8a6'),
    (p_user_id, 'Pendidikan',        'expense', 'education',     '#f59e0b'),
    (p_user_id, 'Perumahan',         'expense', 'housing',       '#64748b'),
    (p_user_id, 'Lainnya',           'expense', 'other_expense', '#6b7280');
end;
$$ language plpgsql security definer set search_path = public;

-- ── TRIGGER: Auto-create categories on user signup ────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  perform public.create_default_categories(new.id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Drop existing trigger if any, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ✅ Done! Run this entire script in Supabase SQL Editor.
-- After running, register in your app and categories will be
-- automatically seeded for your account.
-- ============================================================
