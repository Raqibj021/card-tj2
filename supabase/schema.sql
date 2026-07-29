-- Vizora MVP database foundation.
-- Run this file in a new Supabase project's SQL editor.

create extension if not exists pgcrypto;

create type public.account_role as enum ('user', 'moderator', 'admin');
create type public.card_visibility as enum ('private', 'public', 'organization', 'public_organization');
create type public.review_status as enum ('draft', 'pending', 'approved', 'changes_requested', 'rejected', 'suspended');
create type public.organization_role as enum ('owner', 'admin', 'editor', 'employee', 'viewer');
create type public.order_status as enum ('draft', 'payment_pending', 'payment_review', 'active', 'rejected', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text unique,
  email text,
  role public.account_role not null default 'user',
  preferred_language text not null default 'ru' check (preferred_language in ('ru', 'tj', 'en')),
  marketing_consent boolean not null default false,
  identity_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  slug text not null unique,
  full_name text not null,
  position text not null default '',
  organization_name text not null default '',
  description text not null default '',
  photo_path text,
  contacts jsonb not null default '{}'::jsonb,
  address text not null default '',
  language text not null default 'ru' check (language in ('ru', 'tj', 'en')),
  theme text not null default 'blue',
  template text not null default 'executive',
  visibility public.card_visibility not null default 'private',
  review_status public.review_status not null default 'draft',
  profession_category_id uuid,
  verified_at timestamptz,
  views bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforces one personal card per verified account.
create unique index cards_one_personal_card_per_owner on public.cards(owner_id);

create table public.profession_categories (
  id uuid primary key default gen_random_uuid(),
  name_ru text not null,
  name_tj text not null,
  name_en text not null,
  slug text not null unique,
  enabled boolean not null default true,
  requires_license boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.cards
  add constraint cards_profession_category_fk
  foreign key (profession_category_id)
  references public.profession_categories(id);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  slug text not null unique,
  legal_name text not null,
  display_name text not null,
  organization_type text not null,
  logo_path text,
  description text not null default '',
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  review_status public.review_status not null default 'pending',
  plan_code text,
  employee_limit integer not null default 20,
  active_until timestamptz,
  activation_code_hash text,
  activation_code_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null default 'employee',
  joined_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_id uuid references public.departments(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.employee_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  position text not null,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  organization_id uuid references public.organizations(id),
  order_number text not null unique,
  plan_code text not null,
  amount_somoni numeric(10,2) not null,
  payer_name text not null default '',
  receipt_path text,
  status public.order_status not null default 'draft',
  expires_at timestamptz not null default (now() + interval '7 days'),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id),
  card_id uuid references public.cards(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  document_paths text[] not null default '{}',
  status public.review_status not null default 'pending',
  reviewer_note text not null default '',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  ticket_number text not null unique,
  category text not null,
  subject text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles(id),
  card_id uuid not null references public.cards(id) on delete cascade,
  reason text not null,
  details text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  plan_code text not null,
  source text not null default 'payment',
  starts_at timestamptz not null default now(),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.launch_promo_claims (
  id bigint generated always as identity primary key,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  check (id between 1 and 50)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  client_name text not null,
  phone text not null,
  email text not null default '',
  service text not null default '',
  message text not null default '',
  source text not null check (source in ('contact', 'callback', 'request')),
  status text not null default 'new' check (status in ('new', 'contacted', 'in_progress', 'completed')),
  payment_status text not null default 'not_required' check (payment_status in ('not_required', 'pending', 'paid')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lead_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid references public.profiles(id),
  event_text text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.cards enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.departments enable row level security;
alter table public.employee_assignments enable row level security;
alter table public.orders enable row level security;
alter table public.verification_requests enable row level security;
alter table public.support_tickets enable row level security;
alter table public.reports enable row level security;
alter table public.subscriptions enable row level security;
alter table public.launch_promo_claims enable row level security;
alter table public.leads enable row level security;
alter table public.lead_history enable row level security;

create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "cards public or own" on public.cards for select using (
  owner_id = auth.uid()
  or (review_status = 'approved' and visibility in ('public', 'public_organization'))
);
create policy "cards create own" on public.cards for insert with check (owner_id = auth.uid());
create policy "cards update own" on public.cards for update using (owner_id = auth.uid());
create policy "cards delete own" on public.cards for delete using (owner_id = auth.uid());
create policy "organizations public or member" on public.organizations for select using (
  review_status = 'approved'
  or owner_id = auth.uid()
  or exists (
    select 1 from public.organization_members m
    where m.organization_id = id and m.profile_id = auth.uid()
  )
);
create policy "organizations create own" on public.organizations for insert with check (owner_id = auth.uid());
create policy "organization owner updates" on public.organizations for update using (owner_id = auth.uid());
create policy "members see memberships" on public.organization_members for select using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.owner_id = auth.uid()
  )
);
create policy "owners manage memberships" on public.organization_members for all using (
  exists (
    select 1 from public.organizations o
    where o.id = organization_id and o.owner_id = auth.uid()
  )
);
create policy "departments public read" on public.departments for select using (true);
create policy "organization admins manage departments" on public.departments for all using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_id
      and m.profile_id = auth.uid()
      and m.role in ('owner', 'admin', 'editor')
  )
);
create policy "assignments public read" on public.employee_assignments for select using (is_public or profile_id = auth.uid());
create policy "organization admins manage assignments" on public.employee_assignments for all using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_id
      and m.profile_id = auth.uid()
      and m.role in ('owner', 'admin', 'editor')
  )
);
create policy "orders own read" on public.orders for select using (user_id = auth.uid());
create policy "orders own create" on public.orders for insert with check (user_id = auth.uid());
create policy "verifications own read" on public.verification_requests for select using (profile_id = auth.uid());
create policy "verifications own create" on public.verification_requests for insert with check (profile_id = auth.uid());
create policy "tickets own access" on public.support_tickets for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reports own create" on public.reports for insert with check (reporter_id = auth.uid());
create policy "subscriptions own read" on public.subscriptions for select using (profile_id = auth.uid());
create policy "promo own read" on public.launch_promo_claims for select using (profile_id = auth.uid());
create policy "lead owners manage" on public.leads for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "lead owners see history" on public.lead_history for select using (
  exists (select 1 from public.leads l where l.id = lead_id and l.owner_id = auth.uid())
);
create policy "lead owners add history" on public.lead_history for insert with check (
  author_id = auth.uid()
  and exists (select 1 from public.leads l where l.id = lead_id and l.owner_id = auth.uid())
);

create or replace function public.submit_public_lead(
  target_card_id uuid,
  client_name text,
  phone text,
  email text default '',
  service text default '',
  message text default '',
  source text default 'request'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  card_owner uuid;
  new_lead_id uuid;
begin
  if length(trim(client_name)) < 2 or length(trim(phone)) < 5 then
    raise exception 'Invalid contact data';
  end if;
  if source not in ('contact', 'callback', 'request') then
    raise exception 'Invalid lead source';
  end if;
  select owner_id into card_owner from public.cards
  where id = target_card_id and review_status = 'approved'
    and visibility in ('public', 'public_organization');
  if card_owner is null then raise exception 'Card unavailable'; end if;

  insert into public.leads (card_id, owner_id, client_name, phone, email, service, message, source)
  values (target_card_id, card_owner, trim(client_name), trim(phone), trim(email), trim(service), trim(message), source)
  returning id into new_lead_id;
  insert into public.lead_history (lead_id, event_text)
  values (new_lead_id, 'Обращение создано');
  return new_lead_id;
end;
$$;

grant execute on function public.submit_public_lead(uuid, text, text, text, text, text, text) to anon, authenticated;

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
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from auth.users
    where id = auth.uid() and email_confirmed_at is not null
  ) then
    raise exception 'Email verification required';
  end if;

  select id into new_place
  from public.launch_promo_claims
  where profile_id = auth.uid();

  if new_place is null then
    lock table public.launch_promo_claims in exclusive mode;
    if (select count(*) from public.launch_promo_claims) >= 50 then
      return query select false, null::bigint, null::timestamptz;
      return;
    end if;

    insert into public.launch_promo_claims (profile_id)
    values (auth.uid())
    returning id into new_place;

    insert into public.subscriptions (profile_id, plan_code, source, expires_at)
    values (auth.uid(), 'personal', 'launch_promo', promo_expiry)
    on conflict (profile_id) do nothing;
  else
    select s.expires_at into promo_expiry
    from public.subscriptions s
    where s.profile_id = auth.uid();
  end if;

  return query select true, new_place, promo_expiry;
end;
$$;

create or replace function public.launch_promo_remaining()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, 50 - count(*))::integer
  from public.launch_promo_claims;
$$;

grant execute on function public.claim_launch_promo() to authenticated;
grant execute on function public.launch_promo_remaining() to anon, authenticated;

create or replace function public.increment_card_views(target_card_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.cards
  set views = views + 1
  where id = target_card_id
    and review_status = 'approved'
    and visibility in ('public', 'public_organization');
$$;

grant execute on function public.increment_card_views(uuid) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
