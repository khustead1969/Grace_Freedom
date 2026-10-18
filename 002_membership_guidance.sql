-- Apply AFTER supabase/001_member_security.sql. Requires SERVICE ROLE for RPC.
create table if not exists public.member_payment_events(event_id text primary key,processed_at timestamptz not null default now());
alter table public.member_payment_events enable row level security;
revoke all on public.member_payment_events from anon,authenticated;
create or replace function public.apply_member_payment_event(p_event_id text,p_user_id uuid,p_tier text,p_status text,p_customer_id text,p_subscription_id text,p_session_id text,p_period_end timestamptz)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_event_id is null or length(p_event_id)<5 or p_tier not in ('reset','plus','family') or p_status not in ('active','trialing','past_due','canceled','inactive') then raise exception 'Invalid event'; end if;
 insert into public.member_payment_events(event_id) values(p_event_id) on conflict do nothing;
 if not found then return false; end if;
 insert into public.member_entitlements(user_id,tier,status,stripe_customer_id,stripe_subscription_id,stripe_checkout_session_id,current_period_end,updated_at)
 values(p_user_id,p_tier,p_status,p_customer_id,p_subscription_id,p_session_id,p_period_end,now())
 on conflict(user_id) do update set tier=excluded.tier,status=excluded.status,
 stripe_customer_id=coalesce(excluded.stripe_customer_id,member_entitlements.stripe_customer_id),
 stripe_subscription_id=coalesce(excluded.stripe_subscription_id,member_entitlements.stripe_subscription_id),
 stripe_checkout_session_id=coalesce(excluded.stripe_checkout_session_id,member_entitlements.stripe_checkout_session_id),
 current_period_end=coalesce(excluded.current_period_end,member_entitlements.current_period_end),updated_at=now();
 return true;
end $$;
revoke all on function public.apply_member_payment_event(text,uuid,text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.apply_member_payment_event(text,uuid,text,text,text,text,text,timestamptz) to service_role;
create table if not exists public.member_guidance_preferences(user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),faith_preference text not null default 'Christian' check(faith_preference in ('Catholic','Christian','Faith-Light')),frequency text not null default 'weekly' check(frequency in ('off','daily','weekly','monthly')),email_opt_in boolean not null default false,updated_at timestamptz not null default now());
alter table public.member_guidance_preferences enable row level security;
grant select,insert,update,delete on public.member_guidance_preferences to authenticated;
drop policy if exists guidance_self on public.member_guidance_preferences;
create policy guidance_self on public.member_guidance_preferences for all to authenticated using (user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
