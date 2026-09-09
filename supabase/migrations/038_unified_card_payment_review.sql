-- VIZORA.TJ: one user-facing and administrator-facing review for paid cards.
-- The receipt, card and specialist documents remain independently auditable,
-- but one administrator action approves them atomically.

alter table public.orders
  add column if not exists card_id uuid references public.cards(id) on delete set null;

create index if not exists orders_card_review_idx
  on public.orders(card_id, status, created_at desc);

create or replace function public.attach_card_to_payment_review()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.plan_code in ('personal','specialist','pro') then
    select c.id into new.card_id
    from public.cards c where c.owner_id=new.user_id
    order by c.updated_at desc limit 1;
    if new.card_id is null then
      raise exception 'Сначала сохраните визитку, затем отправьте чек.';
    end if;
    update public.cards set review_status='pending',visibility='private',updated_at=now()
    where id=new.card_id and review_status in ('draft','changes_requested','rejected');
  end if;
  return new;
end;
$$;

drop trigger if exists attach_card_to_payment_review_trigger on public.orders;
create trigger attach_card_to_payment_review_trigger
before insert on public.orders for each row
when (new.status in ('payment_pending','payment_review'))
execute function public.attach_card_to_payment_review();

update public.orders o set card_id=c.id
from public.cards c
where o.card_id is null and o.organization_id is null and o.user_id=c.owner_id
  and o.plan_code in ('personal','specialist','pro');

update public.cards c set review_status='pending',visibility='private',updated_at=now()
where c.review_status in ('draft','changes_requested','rejected') and exists(
  select 1 from public.orders o where o.card_id=c.id
    and o.status in ('payment_pending','payment_review') and o.activated_at is null
);

create or replace function public.get_admin_unified_commerce_workspace()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare base jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  base:=public.get_admin_commerce_workspace();
  return jsonb_set(base,'{payments}',coalesce((
    select jsonb_agg(payment || jsonb_build_object(
      'cardId',c.id,'cardName',coalesce(c.full_name,''),'cardSlug',coalesce(c.slug,''),
      'cardStatus',coalesce(c.review_status::text,''),
      'verificationStatus',coalesce(v.status::text,''),
      'documentPaths',coalesce(v.document_paths,'{}'::text[]),
      'requiresLicense',coalesce(pc.requires_license,false)
    ) order by (payment->>'createdAt')::timestamptz desc)
    from jsonb_array_elements(coalesce(base->'payments','[]'::jsonb)) payment
    join public.orders o on o.id=(payment->>'id')::uuid
    left join public.cards c on c.id=o.card_id
    left join lateral (
      select vr.status,vr.document_paths from public.verification_requests vr
      where vr.card_id=c.id order by vr.created_at desc limit 1
    ) v on true
    left join public.profession_categories pc on pc.id=c.profession_category_id
  ),'[]'::jsonb));
end;
$$;

create or replace function public.get_admin_unified_moderation_workspace()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare base jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  base:=public.get_admin_moderation_workspace();
  base:=jsonb_set(base,'{cards}',coalesce((
    select jsonb_agg(card_item)
    from jsonb_array_elements(coalesce(base->'cards','[]'::jsonb)) card_item
    where not exists(
      select 1 from public.orders o where o.card_id=(card_item->>'id')::uuid
        and o.status in ('payment_pending','payment_review') and o.activated_at is null
    )
  ),'[]'::jsonb));
  base:=jsonb_set(base,'{stats,cards}',to_jsonb(jsonb_array_length(base->'cards')));
  return base;
end;
$$;

create or replace function public.admin_approve_publication(target_order_id uuid,note text default '')
returns text language plpgsql security definer set search_path=public,auth as $$
declare selected public.orders%rowtype; target_card public.cards%rowtype; latest_verification public.verification_requests%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'Доступ разрешён только главному администратору'; end if;
  select * into selected from public.orders where id=target_order_id for update;
  if selected.id is null then raise exception 'Заявка не найдена'; end if;

  if selected.plan_code in ('personal','specialist','pro') then
    select * into target_card from public.cards where id=selected.card_id and owner_id=selected.user_id for update;
    if target_card.id is null then raise exception 'К заявке не привязана визитка'; end if;
    if target_card.review_status<>'pending' then raise exception 'Визитка ещё не исправлена и не отправлена повторно'; end if;
    if selected.plan_code in ('specialist','pro') then
      select * into latest_verification from public.verification_requests
      where card_id=target_card.id order by created_at desc limit 1 for update;
      if latest_verification.id is null then raise exception 'К заявке специалиста не приложены данные проверки'; end if;
    end if;
  end if;

  perform public.admin_approve_payment(target_order_id,note);

  if target_card.id is not null then
    if latest_verification.id is not null then
      update public.verification_requests set status='approved',reviewer_note=trim(coalesce(note,'')),
        reviewed_by=auth.uid(),reviewed_at=now() where id=latest_verification.id;
    end if;
    update public.cards set review_status='approved',visibility='public',verified_at=now(),
      published_at=now(),trial_expires_at=null,updated_at=now() where id=target_card.id;
    update public.notifications set kind='application_approved',title='Заявка одобрена',
      body='Оплата подтверждена, тариф активирован, визитка одобрена и опубликована.',action_url='/dashboard'
    where id=(select n.id from public.notifications n where n.user_id=selected.user_id
      and n.kind='payment_confirmed' order by n.created_at desc limit 1);
    insert into public.admin_audit_log(admin_id,action,details)
    values(auth.uid(),'unified_application_approved',jsonb_build_object(
      'orderId',selected.id,'cardId',target_card.id,'verificationId',latest_verification.id));
    return 'activated_and_published';
  end if;
  return 'activated';
end;
$$;

revoke all on function public.get_admin_unified_commerce_workspace() from public;
revoke all on function public.get_admin_unified_moderation_workspace() from public;
revoke all on function public.admin_approve_publication(uuid,text) from public;
grant execute on function public.get_admin_unified_commerce_workspace() to authenticated;
grant execute on function public.get_admin_unified_moderation_workspace() to authenticated;
grant execute on function public.admin_approve_publication(uuid,text) to authenticated;
