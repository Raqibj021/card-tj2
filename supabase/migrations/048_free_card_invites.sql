-- Free card invitations: a specialist fills a short public form (with consent),
-- an admin approves it, a public card is created and handed over to the
-- specialist through a private claim link once they register.

create table if not exists public.card_invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 80),
  profession text not null check (char_length(btrim(profession)) between 2 and 80),
  city text not null default '' check (char_length(city) <= 60),
  about text not null default '' check (char_length(about) <= 300),
  phone text not null check (char_length(btrim(phone)) between 6 and 24),
  whatsapp text not null default '' check (char_length(whatsapp) <= 24),
  telegram text not null default '' check (char_length(telegram) <= 64),
  instagram text not null default '' check (char_length(instagram) <= 64),
  language text not null default 'tj' check (language in ('ru', 'tj', 'en')),
  source text not null default '' check (char_length(source) <= 40),
  consent boolean not null check (consent),
  status text not null default 'new' check (status in ('new', 'approved', 'rejected', 'claimed')),
  card_id uuid references public.cards(id) on delete set null,
  claim_token text not null unique default (replace(gen_random_uuid()::text, '-', '') || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  admin_note text not null default ''
);

create index if not exists card_invites_status_created_idx on public.card_invites (status, created_at desc);
create index if not exists card_invites_phone_idx on public.card_invites (phone);

alter table public.card_invites enable row level security;

drop policy if exists "Admins read card invites" on public.card_invites;
create policy "Admins read card invites" on public.card_invites
  for select to authenticated using (public.is_platform_admin());

drop policy if exists "Admins update card invites" on public.card_invites;
create policy "Admins update card invites" on public.card_invites
  for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

revoke all on public.card_invites from anon;
grant select, update on public.card_invites to authenticated;

-- 1. Public submission (anon or signed-in). Returns only the new id.
create or replace function public.submit_card_invite(
  p_full_name text,
  p_profession text,
  p_city text,
  p_about text,
  p_phone text,
  p_whatsapp text,
  p_telegram text,
  p_instagram text,
  p_language text,
  p_source text,
  p_consent boolean
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_wa text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9]', '', 'g');
  v_id uuid;
begin
  if length(v_phone) = 9 then v_phone := '992' || v_phone; end if;
  if length(v_wa) = 9 then v_wa := '992' || v_wa; end if;
  if v_wa = '' then v_wa := v_phone; end if;
  if v_phone !~ '^992[0-9]{9}$' then raise exception 'bad_phone'; end if;
  if v_wa !~ '^992[0-9]{9}$' then raise exception 'bad_whatsapp'; end if;
  if btrim(coalesce(p_full_name, '')) !~ '[[:alpha:]]{2,}[[:space:]]+[[:alpha:]]{2,}' then raise exception 'bad_name'; end if;
  if not coalesce(p_consent, false) then
    raise exception 'consent_required';
  end if;
  -- simple anti-spam: max 3 applications per phone per day
  if (select count(*) from public.card_invites
      where phone = v_phone and created_at > now() - interval '1 day') >= 3 then
    raise exception 'too_many_requests';
  end if;

  insert into public.card_invites (
    full_name, profession, city, about, phone, whatsapp, telegram, instagram, language, source, consent
  ) values (
    btrim(p_full_name), btrim(p_profession), btrim(coalesce(p_city, '')), btrim(coalesce(p_about, '')),
    v_phone,
    v_wa,
    btrim(coalesce(p_telegram, '')), btrim(coalesce(p_instagram, '')),
    case when p_language in ('ru', 'tj', 'en') then p_language else 'tj' end,
    left(coalesce(p_source, ''), 40),
    true
  ) returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.submit_card_invite(text, text, text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.submit_card_invite(text, text, text, text, text, text, text, text, text, text, boolean) to anon, authenticated;

-- 2. Admin approves: creates a public card (owned by the admin until claimed).
create or replace function public.admin_approve_card_invite(p_invite_id uuid, p_slug text)
returns table (card_id uuid, slug text, claim_token text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_invite public.card_invites%rowtype;
  v_slug text := lower(regexp_replace(coalesce(p_slug, ''), '[^a-z0-9-]', '', 'g'));
  v_try text;
  v_n int := 1;
  v_card uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_invite from public.card_invites where id = p_invite_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_invite.status not in ('new', 'rejected') then raise exception 'already_processed'; end if;

  if v_slug = '' then v_slug := 'card'; end if;
  v_try := v_slug;
  while exists (select 1 from public.cards c where c.slug = v_try) loop
    v_n := v_n + 1;
    v_try := v_slug || '-' || v_n;
  end loop;

  insert into public.cards (
    owner_id, slug, full_name, position, organization_name, description, contacts, address,
    language, template, visibility, review_status, published_at, specialist_title, specialist_city
  ) values (
    auth.uid(), v_try, v_invite.full_name, v_invite.profession,
    case v_invite.language when 'ru' then 'Частный специалист' when 'en' then 'Independent specialist' else 'Мутахассиси хусусӣ' end,
    v_invite.about,
    jsonb_build_object(
      'phone', '+' || v_invite.phone,
      'whatsapp', '+' || v_invite.whatsapp,
      'telegram', v_invite.telegram,
      'instagram', v_invite.instagram
    ),
    v_invite.city, v_invite.language, 'executive', 'public', 'approved', now(),
    v_invite.profession, v_invite.city
  ) returning id into v_card;

  update public.card_invites
     set status = 'approved', card_id = v_card, updated_at = now()
   where id = p_invite_id;

  return query select v_card, v_try, v_invite.claim_token;
end;
$$;

revoke all on function public.admin_approve_card_invite(uuid, text) from public;
grant execute on function public.admin_approve_card_invite(uuid, text) to authenticated;

-- 3. Public preview of an invitation by its private token.
create or replace function public.get_card_invite(p_token text)
returns table (full_name text, profession text, slug text, status text, language text)
language sql
security definer
set search_path = public
stable
as $$
  select i.full_name, i.profession, c.slug, i.status, i.language
    from public.card_invites i
    left join public.cards c on c.id = i.card_id
   where i.claim_token = p_token
     and i.status in ('approved', 'claimed');
$$;

revoke all on function public.get_card_invite(text) from public;
grant execute on function public.get_card_invite(text) to anon, authenticated;

-- 4. Signed-in specialist claims the card: it moves into their account.
create or replace function public.claim_card_invite(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.card_invites%rowtype;
  v_slug text;
begin
  if auth.uid() is null then raise exception 'auth_required'; end if;

  select * into v_invite from public.card_invites where claim_token = p_token for update;
  if not found or v_invite.card_id is null then raise exception 'not_found'; end if;

  if v_invite.status = 'claimed' then
    if v_invite.claimed_by = auth.uid() then
      select c.slug into v_slug from public.cards c where c.id = v_invite.card_id;
      return v_slug;
    end if;
    raise exception 'already_claimed';
  end if;
  if v_invite.status <> 'approved' then raise exception 'not_ready'; end if;

  update public.cards set owner_id = auth.uid(), updated_at = now()
   where id = v_invite.card_id
   returning slug into v_slug;

  update public.card_invites
     set status = 'claimed', claimed_by = auth.uid(), claimed_at = now(), updated_at = now()
   where id = v_invite.id;

  return v_slug;
end;
$$;

revoke all on function public.claim_card_invite(text) from public;
grant execute on function public.claim_card_invite(text) to authenticated;
