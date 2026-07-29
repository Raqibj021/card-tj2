create table if not exists public.leads (
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
create table if not exists public.lead_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  author_id uuid references public.profiles(id),
  event_text text not null,
  created_at timestamptz not null default now()
);
alter table public.leads enable row level security;
alter table public.lead_history enable row level security;
create policy "lead owners manage" on public.leads for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "lead owners see history" on public.lead_history for select using (
  exists (select 1 from public.leads l where l.id = lead_id and l.owner_id = auth.uid())
);
create policy "lead owners add history" on public.lead_history for insert with check (
  author_id = auth.uid() and exists (select 1 from public.leads l where l.id = lead_id and l.owner_id = auth.uid())
);
create or replace function public.submit_public_lead(
  target_card_id uuid, client_name text, phone text, email text default '',
  service text default '', message text default '', source text default 'request'
) returns uuid language plpgsql security definer set search_path = public as $$
declare card_owner uuid; new_lead_id uuid;
begin
  if length(trim(client_name)) < 2 or length(trim(phone)) < 5 then raise exception 'Invalid contact data'; end if;
  if source not in ('contact', 'callback', 'request') then raise exception 'Invalid lead source'; end if;
  select owner_id into card_owner from public.cards where id = target_card_id
    and review_status = 'approved' and visibility in ('public', 'public_organization');
  if card_owner is null then raise exception 'Card unavailable'; end if;
  insert into public.leads (card_id, owner_id, client_name, phone, email, service, message, source)
  values (target_card_id, card_owner, trim(client_name), trim(phone), trim(email), trim(service), trim(message), source)
  returning id into new_lead_id;
  insert into public.lead_history (lead_id, event_text) values (new_lead_id, 'Обращение создано');
  return new_lead_id;
end; $$;
grant execute on function public.submit_public_lead(uuid, text, text, text, text, text, text) to anon, authenticated;
