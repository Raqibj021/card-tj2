-- Исправляет одобрение и отклонение визиток в уже развёрнутой базе.
-- Таблица notifications использует kind/body/action_url, а не type/message/metadata.

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
  if decision in ('changes_requested','rejected','suspended')
    and length(trim(coalesce(note,''))) < 3
    then raise exception 'Review reason is required'; end if;

  select * into target from public.cards where id=target_card_id for update;
  if target.id is null then raise exception 'Card not found'; end if;

  if decision='approved' then
    has_entitlement:=exists(
      select 1 from public.subscriptions s
      where s.profile_id=target.owner_id and s.expires_at>now()
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
    ) then
      raise exception 'Cannot approve: professional documents are not verified';
    end if;
  end if;

  update public.cards set
    review_status=decision,
    visibility=case when decision='approved' then
      case when exists(
        select 1 from public.organization_members where profile_id=target.owner_id
      ) then 'public_organization'::public.card_visibility
        else 'public'::public.card_visibility end
      else 'private'::public.card_visibility end,
    verified_at=case when decision='approved' then now() else verified_at end,
    published_at=case when decision='approved' then now() else published_at end,
    trial_expires_at=null,
    updated_at=now()
  where id=target_card_id;

  insert into public.notifications(user_id,kind,title,body,action_url)
  values(
    target.owner_id,
    'card_review',
    case decision
      when 'approved' then 'Визитка одобрена'
      when 'changes_requested' then 'Нужно исправить визитку'
      when 'rejected' then 'Визитка отклонена'
      else 'Визитка приостановлена'
    end,
    case decision
      when 'approved' then 'QR-код и публичная ссылка активированы.'
      else coalesce(
        nullif(trim(note),''),
        'Откройте личный кабинет, чтобы посмотреть статус.'
      )
    end,
    '/dashboard'
  );

  insert into public.admin_audit_log(admin_id,action,details)
  values(
    auth.uid(),
    'moderation_card_decision',
    jsonb_build_object(
      'cardId',target_card_id,
      'from',target.review_status,
      'to',decision,
      'note',trim(note)
    )
  );
end;
$$;

grant execute on function public.admin_review_card(
  uuid,public.review_status,text
) to authenticated;
