-- Supplier profile fields and sponsored product/service deals.
-- This project uses auth-less device ownership and the existing profiles.id
-- is text, so supplier_id intentionally references profiles(id) rather than
-- auth.users(id). Apply this migration in the Supabase SQL editor.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists user_type varchar(20) not null default 'customer',
  add column if not exists store_name varchar(100),
  add column if not exists address_text text,
  add column if not exists discount_rate numeric not null default 0;

alter table public.profiles
  drop constraint if exists profiles_user_type_check;

alter table public.profiles
  add constraint profiles_user_type_check
  check (user_type in ('customer', 'master', 'supplier'));

create table if not exists public.supplier_deals (
  id uuid primary key default gen_random_uuid(),
  supplier_id text not null references public.profiles(id) on delete cascade,
  title varchar(150) not null,
  description text,
  discount_percentage numeric,
  original_price numeric,
  discounted_price numeric,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists supplier_deals_supplier_id_idx
  on public.supplier_deals(supplier_id);

create index if not exists supplier_deals_created_at_idx
  on public.supplier_deals(created_at desc);

alter table public.supplier_deals enable row level security;

drop policy if exists supplier_deals_no_anon_access on public.supplier_deals;
create policy supplier_deals_no_anon_access
  on public.supplier_deals
  for all to anon
  using (false)
  with check (false);