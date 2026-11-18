-- Free card invites: remember the Tajikistan design the specialist picked
-- and apply a matching colour theme when the card is created.

alter table public.card_invites
  add column if not exists design text not null default '' check (char_length(design) <= 40);

drop function if exists public.submit_card_invite(text, text, text, text, text, text, text, text, text, text, boolean);

create or replace function public.submit_card_invite(
  p_full_name text, p_profession text, p_city text, p_about text, p_phone text,
  p_whatsapp text, p_telegram text, p_instagram text, p_language text, p_source text,
  p_consent boolean, p_design text default ''
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
  if not coalesce(p_consent, false) then raise exception 'consent_required'; end if;
  if (select count(*) from public.card_invites
      where phone = v_phone and created_at > now() - interval '1 day') >= 3 then
    raise exception 'too_many_requests';
  end if;

  insert into public.card_invites (
    full_name, profession, city, about, phone, whatsapp, telegram, instagram, language, source, consent, design
  ) values (
    btrim(p_full_name), btrim(p_profession), btrim(coalesce(p_city, '')), btrim(coalesce(p_about, '')),
    v_phone, v_wa,
    btrim(coalesce(p_telegram, '')), btrim(coalesce(p_instagram, '')),
    case when p_language in ('ru', 'tj', 'en') then p_language else 'tj' end,
    left(coalesce(p_source, ''), 40),
    true,
    left(regexp_replace(coalesce(p_design, ''), '[^a-z0-9-]', '', 'g'), 40)
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_card_invite(text, text, text, text, text, text, text, text, text, text, boolean, text) from public;
grant execute on function public.submit_card_invite(text, text, text, text, text, text, text, text, text, text, boolean, text) to anon, authenticated;

-- colour theme for the chosen design
create or replace function public.card_invite_theme(p_design text)
returns text language sql immutable as $$
  select case p_design
    when 'somoni' then 'amber'
    when 'arch' then 'navy'
    when 'hissar' then 'burgundy'
    when 'independence' then 'teal'
    when 'palace' then 'violet'
    when 'building' then 'blue'
    else 'blue' end;
$$;

create or replace function public.apply_card_invite_theme()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.card_id is not null and (old.card_id is distinct from new.card_id) and new.design <> '' then
    update public.cards set theme = public.card_invite_theme(new.design) where id = new.card_id;
  end if;
  return new;
end;
$$;

drop trigger if exists card_invites_apply_theme on public.card_invites;
create trigger card_invites_apply_theme
  after update of card_id on public.card_invites
  for each row execute function public.apply_card_invite_theme();

-- preview also returns the chosen design
drop function if exists public.get_card_invite(text);
create function public.get_card_invite(p_token text)
returns table (full_name text, profession text, slug text, status text, language text, design text)
language sql security definer set search_path = public stable as $$
  select i.full_name, i.profession, c.slug, i.status, i.language, i.design
    from public.card_invites i
    left join public.cards c on c.id = i.card_id
   where i.claim_token = p_token and i.status in ('approved', 'claimed');
$$;
revoke all on function public.get_card_invite(text) from public;
grant execute on function public.get_card_invite(text) to anon, authenticated;
