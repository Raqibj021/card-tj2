-- VIZORA.TJ: persistent drafts, explicit launch-promo choice and guarded approval.
-- Run after 022_organization_structure_integrity.sql.

update public.cards set trial_expires_at=null where trial_expires_at is not null;
alter table public.cards alter column trial_expires_at drop default;

create or replace function public.get_launch_promo_status()
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare
  promo_limit integer:=50;
  used_count integer:=0;
  own_claim public.launch_promo_claims%rowtype;
  own_expiry timestamptz;
  can_claim boolean:=false;
  has_entitlement boolean:=false;
begin
  select coalesce(promotion_limit,50) into promo_limit
  from public.platform_settings where id=true and launch_status='live';
  promo_limit:=coalesce(promo_limit,50);
  select count(*) into used_count from public.launch_promo_claims;
  if auth.uid() is not null then
    select * into own_claim from public.launch_promo_claims where profile_id=auth.uid();
    select expires_at into own_expiry from public.subscriptions
      where profile_id=auth.uid() and source='launch_promo';
    can_claim:=own_claim.id is not null or (
      used_count<promo_limit
      and not exists(select 1 from public.organization_members where profile_id=auth.uid())
      and not exists(select 1 from public.organizations where owner_id=auth.uid())
    );
    has_entitlement:=exists(
      select 1 from public.subscriptions where profile_id=auth.uid() and expires_at>now()
    ) or exists(
      select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
      where m.profile_id=auth.uid() and o.active_until>now()
    );
  end if;
  return jsonb_build_object(
    'remaining',greatest(0,promo_limit-used_count),
    'limit',promo_limit,
    'claimed',own_claim.id is not null,
    'placeNumber',own_claim.id,
    'expiresAt',own_expiry,
    'eligible',can_claim,
    'hasEntitlement',has_entitlement
  );
end;
$$;

grant execute on function public.get_launch_promo_status() to anon,authenticated;

create or replace function public.request_card_review(target_card_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.cards where id=target_card_id and owner_id=auth.uid())
    then raise exception 'Card not found'; end if;
  if not exists(select 1 from public.subscriptions where profile_id=auth.uid() and expires_at>now())
    and not exists(
      select 1 from public.organization_members m
      join public.organizations o on o.id=m.organization_id
      where m.profile_id=auth.uid() and o.active_until>now()
    )
    then raise exception 'Choose the launch offer or pay for a tariff first'; end if;
  if exists(
    select 1 from public.cards c join public.profession_categories p on p.id=c.profession_category_id
    where c.id=target_card_id and p.requires_license and not exists(
      select 1 from public.verification_requests v
      where v.card_id=c.id and cardinality(v.document_paths)>0
    )
  ) then raise exception 'Verification documents required'; end if;
  update public.cards set review_status='pending',visibility='private',
    trial_expires_at=null,updated_at=now()
  where id=target_card_id and owner_id=auth.uid();
end;
$$;

grant execute on function public.request_card_review(uuid) to authenticated;

create or replace function public.claim_launch_promo_for_card(target_card_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth
as $$
declare
  promo_result record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.organization_members where profile_id=auth.uid())
    or exists(select 1 from public.organizations where owner_id=auth.uid())
    then raise exception 'The launch offer is only for personal cards'; end if;
  if not exists(select 1 from public.cards where id=target_card_id and owner_id=auth.uid())
    then raise exception 'Card not found'; end if;
  select * into promo_result from public.claim_launch_promo();
  if not coalesce(promo_result.claimed,false)
    then raise exception 'The first 50 free places have already been claimed'; end if;
  perform public.request_card_review(target_card_id);
  return public.get_launch_promo_status();
end;
$$;

grant execute on function public.claim_launch_promo_for_card(uuid) to authenticated;

create or replace function public.admin_review_card(
  target_card_id uuid, decision public.review_status, note text default ''
)
returns void language plpgsql security definer set search_path=public
as $$
declare
  target public.cards%rowtype;
  has_entitlement boolean:=false;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if decision not in ('approved','changes_requested','rejected','suspended')
    then raise exception 'Invalid review decision'; end if;
  select * into target from public.cards where id=target_card_id for update;
  if target.id is null then raise exception 'Card not found'; end if;

  if decision='approved' then
    has_entitlement:=exists(
      select 1 from public.subscriptions s where s.profile_id=target.owner_id and s.expires_at>now()
    ) or exists(
      select 1 from public.organization_members m
      join public.organizations o on o.id=m.organization_id
      where m.profile_id=target.owner_id and o.active_until>now()
    );
    if not has_entitlement then
      raise exception 'Cannot approve: payment or launch offer is not active';
    end if;
    if exists(
      select 1 from public.profession_categories p
      where p.id=target.profession_category_id and p.requires_license
        and not exists(
          select 1 from public.verification_requests v
          where v.card_id=target.id and v.status='approved'
        )
    ) then raise exception 'Cannot approve: professional documents are not verified'; end if;
  end if;

  update public.cards set
    review_status=decision,
    visibility=case when decision='approved' then
      case when exists(select 1 from public.organization_members where profile_id=target.owner_id)
        then 'public_organization'::public.card_visibility
        else 'public'::public.card_visibility end
      else 'private'::public.card_visibility end,
    verified_at=case when decision='approved' then now() else verified_at end,
    published_at=case when decision='approved' then now() else published_at end,
    trial_expires_at=null,
    updated_at=now()
  where id=target_card_id;

  insert into public.notifications(user_id,kind,title,body,action_url)
  values(target.owner_id,'card_review',
    case decision when 'approved' then 'Визитка одобрена'
      when 'changes_requested' then 'Нужно исправить визитку'
      when 'rejected' then 'Визитка отклонена' else 'Визитка приостановлена' end,
    case decision when 'approved' then 'QR-код и публичная ссылка активированы.'
      else coalesce(nullif(trim(note),''),'Откройте личный кабинет, чтобы посмотреть статус.') end,
    '/dashboard');

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'moderation_card_decision',jsonb_build_object(
    'cardId',target_card_id,'from',target.review_status,'to',decision,'note',trim(note)
  ));
end;
$$;

grant execute on function public.admin_review_card(uuid,public.review_status,text) to authenticated;
