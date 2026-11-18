-- After the "first 50" launch places run out, a free card that a specialist
-- claims becomes a draft in their account: it stays private until they choose
-- a plan and pay (the usual payment → review → activation flow). While places
-- are left, the claim takes the next place and the card stays active.

alter table public.card_invites add column if not exists needs_payment boolean not null default false;

create or replace function public.claim_card_invite(p_token text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.card_invites%rowtype;
  v_slug text;
  v_has_promo boolean;
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

  begin
    perform public.claim_launch_promo();
  exception when others then
    null;
  end;

  v_has_promo := exists (select 1 from public.launch_promo_claims where profile_id = auth.uid());

  if not v_has_promo then
    update public.cards
       set review_status = 'draft', visibility = 'private', updated_at = now()
     where id = v_invite.card_id;
  end if;

  update public.card_invites
     set status = 'claimed', claimed_by = auth.uid(), claimed_at = now(),
         needs_payment = not v_has_promo, updated_at = now()
   where id = v_invite.id;

  return v_slug;
end;
$$;

revoke all on function public.claim_card_invite(text) from public;
grant execute on function public.claim_card_invite(text) to authenticated;
