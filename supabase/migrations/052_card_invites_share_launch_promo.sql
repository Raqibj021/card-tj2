-- Free cards share the same "first 50" launch promotion as regular sign-ups:
-- the counter continues, it does not start over. When a specialist claims
-- a free card, they take the next promo place (1 year free + NFC card) if
-- places are left.

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

  -- take the next launch-promo place (shared counter) if any are left
  begin
    perform public.claim_launch_promo();
  exception when others then
    null; -- promo not live, no places, e-mail not verified yet, etc.
  end;

  return v_slug;
end;
$$;

revoke all on function public.claim_card_invite(text) from public;
grant execute on function public.claim_card_invite(text) to authenticated;

-- Admin overview: shared promo counter + promo place of each claimed free card.
create or replace function public.admin_card_invites_promo()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_limit int;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  select coalesce(promotion_limit, 50) into v_limit from public.platform_settings where id = true;
  return jsonb_build_object(
    'limit', coalesce(v_limit, 50),
    'used', (select count(*) from public.launch_promo_claims),
    'places', coalesce((
      select jsonb_object_agg(i.id::text, c.id)
        from public.card_invites i
        join public.launch_promo_claims c on c.profile_id = i.claimed_by
       where i.claimed_by is not null
    ), '{}'::jsonb)
  );
end;
$$;

revoke all on function public.admin_card_invites_promo() from public;
grant execute on function public.admin_card_invites_promo() to authenticated;
