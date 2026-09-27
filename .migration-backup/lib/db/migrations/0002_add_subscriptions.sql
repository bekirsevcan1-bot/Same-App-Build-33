-- Usta Cepte monthly subscription state and payment audit.
-- Run against the Supabase database with ON_ERROR_STOP=1.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id text primary key,
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'active', 'past_due', 'cancelled')),
  subscription_end_date timestamptz,
  monthly_fee numeric(10, 2) not null default 3000.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists subscription_end_date timestamptz,
  add column if not exists monthly_fee numeric(10, 2) not null default 3000.00,
  add column if not exists name text,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists tax_id text,
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.payment_history (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  amount numeric(10, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('card', 'bank_transfer')),
  status text not null check (status in ('pending', 'success', 'failed')),
  transaction_id text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists payment_history_user_id_idx on public.payment_history(user_id);
create index if not exists payment_history_created_at_idx on public.payment_history(created_at desc);

create table if not exists public.invoice_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  transaction_id text not null unique references public.payment_history(transaction_id),
  provider text not null,
  provider_invoice_id text,
  customer_email text,
  status text not null check (status in ('pending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists invoice_records_user_id_idx on public.invoice_records(user_id);

alter table public.profiles enable row level security;
alter table public.payment_history enable row level security;
alter table public.invoice_records enable row level security;

-- The API uses the Replit Supabase connector, so browser clients do not receive
-- direct table access. Keep policies closed until an authenticated Supabase
-- policy is deliberately added.
drop policy if exists profiles_no_anon_access on public.profiles;
create policy profiles_no_anon_access on public.profiles for all to anon using (false) with check (false);
drop policy if exists payment_history_no_anon_access on public.payment_history;
create policy payment_history_no_anon_access on public.payment_history for all to anon using (false) with check (false);
drop policy if exists invoice_records_no_anon_access on public.invoice_records;
create policy invoice_records_no_anon_access on public.invoice_records for all to anon using (false) with check (false);