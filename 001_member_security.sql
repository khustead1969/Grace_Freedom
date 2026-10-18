-- Run once in Supabase SQL Editor. Back up existing data before applying.
create extension if not exists pgcrypto;
create table if not exists public.member_profiles (user_id uuid primary key references auth.users(id) on delete cascade, first_name text, faith_preference text not null default 'Christian' check(faith_preference in ('Catholic','Christian','Faith-Light')), created_at timestamptz not null default now());
create table if not exists public.member_debts (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade default auth.uid(), name text not null check(char_length(name) between 1 and 100), balance numeric(14,2) not null check(balance >= 0 and balance <= 1000000000), apr numeric(6,3) not null check(apr between 0 and 100), minimum_payment numeric(14,2) not null check(minimum_payment >= 0), created_at timestamptz not null default now());
create table if not exists public.member_budgets (user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(), monthly_income numeric(14,2) not null default 0 check(monthly_income >= 0), monthly_essentials numeric(14,2) not null default 0 check(monthly_essentials >= 0), updated_at timestamptz not null default now());
create table if not exists public.member_progress (user_id uuid not null references auth.users(id) on delete cascade default auth.uid(), day_number integer not null check(day_number between 1 and 30), completed_at timestamptz not null default now(), primary key(user_id,day_number));
create table if not exists public.member_entitlements (user_id uuid primary key references auth.users(id) on delete cascade, tier text not null default 'free' check(tier in ('free','reset','plus','family')), status text not null default 'inactive' check(status in ('inactive','active','trialing','past_due','canceled')), stripe_customer_id text unique, stripe_subscription_id text unique, stripe_checkout_session_id text unique, current_period_end timestamptz, updated_at timestamptz not null default now());
create index if not exists idx_member_debts_user on public.member_debts(user_id);
-- Never allow a browser to edit entitlements. Only trusted server with service role may write.
alter table public.member_profiles enable row level security;
alter table public.member_debts enable row level security;
alter table public.member_budgets enable row level security;
alter table public.member_progress enable row level security;
alter table public.member_entitlements enable row level security;

revoke all on public.member_entitlements from anon,authenticated;
grant select on public.member_entitlements to authenticated;
grant select,insert,update,delete on public.member_profiles,public.member_debts,public.member_budgets,public.member_progress to authenticated;

drop policy if exists profile_owner on public.member_profiles;
create policy profile_owner on public.member_profiles for all to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
drop policy if exists debts_owner on public.member_debts;
create policy debts_owner on public.member_debts for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists budget_owner on public.member_budgets;
create policy budget_owner on public.member_budgets for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists progress_owner on public.member_progress;
create policy progress_owner on public.member_progress for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists entitlements_read_owner on public.member_entitlements;
create policy entitlements_read_owner on public.member_entitlements for select to authenticated using (user_id=(select auth.uid()));
-- Table grants are intentionally limited; SQL editor owner/service role handles entitlements writes.
