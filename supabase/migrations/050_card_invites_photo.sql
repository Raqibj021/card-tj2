-- Free card invites: optional profile photo (small data URL, uploaded to storage by the admin on approval)

alter table public.card_invites
  add column if not exists photo_data text not null default '' check (char_length(photo_data) <= 400000);

drop function if exists public.submit_card_invite(text, text, text, text, text, text, text, text, text, text, boolean, text);

create or replace function public.submit_card_invite(
  p_full_name text, p_profession text, p_city text, p_about text, p_phone text,
  p_whatsapp text, p_telegram text, p_instagram text, p_language text, p_source text,
  p_consent boolean, p_design text default '', p_photo text default ''
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
  if coalesce(p_photo, '') <> '' and (p_photo !~ '^data:image/(jpeg|png|webp);base64,' or length(p_photo) > 400000) then raise exception 'bad_photo'; end if;
  if (select count(*) from public.card_invites
      where phone = v_phone and created_at > now() - interval '1 day') >= 3 then
    raise exception 'too_many_requests';
  end if;

  insert into public.card_invites (
    full_name, profession, city, about, phone, whatsapp, telegram, instagram, language, source, consent, design, photo_data
  ) values (
    btrim(p_full_name), btrim(p_profession), btrim(coalesce(p_city, '')), btrim(coalesce(p_about, '')),
    v_phone, v_wa,
    btrim(coalesce(p_telegram, '')), btrim(coalesce(p_instagram, '')),
    case when p_language in ('ru', 'tj', 'en') then p_language else 'tj' end,
    left(coalesce(p_source, ''), 40),
    true,
    left(regexp_replace(coalesce(p_design, ''), '[^a-z0-9-]', '', 'g'), 40),
    coalesce(p_photo, '')
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.submit_card_invite(text, text, text, text, text, text, text, text, text, text, boolean, text, text) from public;
grant execute on function public.submit_card_invite(text, text, text, text, text, text, text, text, text, text, boolean, text, text) to anon, authenticated;

