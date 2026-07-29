-- Apply to an existing Vizora database after schema.sql version 1.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  plan_code text not null,
  source text not null default 'payment',
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.launch_promo_claims (
  id bigint generated always as identity primary key,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  check (id between 1 and 50)
);

alter table public.subscriptions enable row level security;
alter table public.launch_promo_claims enable row level security;

create policy "subscriptions own read" on public.subscriptions
  for select using (profile_id = auth.uid());
create policy "promo own read" on public.launch_promo_claims
  for select using (profile_id = auth.uid());

create or replace function public.claim_launch_promo()
returns table (claimed boolean, place_number bigint, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  new_place bigint;
  promo_expiry timestamptz := now() + interval '1 year';
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from auth.users
    where id = auth.uid() and email_confirmed_at is not null
  ) then raise exception 'Email verification required'; end if;

  select id into new_place from public.launch_promo_claims where profile_id = auth.uid();
  if new_place is null then
    lock table public.launch_promo_claims in exclusive mode;
    if (select count(*) from public.launch_promo_claims) >= 50 then
      return query select false, null::bigint, null::timestamptz;
      return;
    end if;
    insert into public.launch_promo_claims (profile_id)
    values (auth.uid()) returning id into new_place;
    insert into public.subscriptions (profile_id, plan_code, source, expires_at)
    values (auth.uid(), 'personal', 'launch_promo', promo_expiry)
    on conflict (profile_id) do nothing;
  else
    select s.expires_at into promo_expiry from public.subscriptions s where s.profile_id = auth.uid();
  end if;
  return query select true, new_place, promo_expiry;
end;
$$;

create or replace function public.launch_promo_remaining()
returns integer language sql stable security definer set search_path = public
as $$ select greatest(0, 50 - count(*))::integer from public.launch_promo_claims; $$;

grant execute on function public.claim_launch_promo() to authenticated;
grant execute on function public.launch_promo_remaining() to anon, authenticated;
