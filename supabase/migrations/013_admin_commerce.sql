-- VIZORA.TJ: administrator commerce workspace.
-- Run after 012_admin_moderation.sql.

alter table public.orders
  add column if not exists rejection_reason text not null default '',
  add column if not exists admin_note text not null default '';

drop policy if exists "admin reads payment receipts" on storage.objects;
create policy "admin reads payment receipts" on storage.objects
for select to authenticated
using (bucket_id = 'payment-receipts' and public.is_platform_admin());

create or replace function public.get_admin_commerce_workspace()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  select jsonb_build_object(
    'stats', jsonb_build_object(
      'pendingPayments',(select count(*) from public.orders where status in ('payment_pending','payment_review') and activated_at is null),
      'activePlans',(select count(*) from public.subscriptions where expires_at > now()),
      'expiringPlans',(select count(*) from public.subscriptions where expires_at between now() and now()+interval '14 days'),
      'tariffRevenue',(select coalesce(sum(amount_somoni),0) from public.orders where status='active'),
      'serviceOrders',(select count(*) from public.service_orders),
      'serviceRevenue',(select coalesce(sum(total),0) from public.service_orders where payment_status='paid'),
      'promoClaimed',(select count(*) from public.launch_promo_claims),
      'promoLimit',(select promotion_limit from public.platform_settings where id=true)
    ),
    'payments',coalesce((select jsonb_agg(item order by created_at desc) from (
      select o.created_at, jsonb_build_object(
        'id',o.id,'orderNumber',o.order_number,'planCode',o.plan_code,
        'amount',o.amount_somoni,'payerName',o.payer_name,'receiptPath',o.receipt_path,
        'status',o.status,'createdAt',o.created_at,'reviewedAt',o.reviewed_at,
        'activatedAt',o.activated_at,'rejectionReason',o.rejection_reason,
        'adminNote',o.admin_note,'customer',o.customer_snapshot,
        'email',coalesce(p.email,''),'organization',coalesce(org.display_name,'')
      ) item
      from public.orders o
      left join public.profiles p on p.id=o.user_id
      left join public.organizations org on org.id=o.organization_id
    ) q),'[]'::jsonb),
    'serviceOrders',coalesce((select jsonb_agg(item order by created_at desc) from (
      select so.created_at, jsonb_build_object(
        'id',so.id,'orderNumber',so.order_number,'customer',so.customer,'items',so.items,
        'total',so.total,'status',so.status,'paymentStatus',so.payment_status,
        'managerComment',so.manager_comment,'createdAt',so.created_at
      ) item from public.service_orders so
    ) q),'[]'::jsonb),
    'contracts',coalesce((select jsonb_agg(item order by created_at desc) from (
      select c.created_at, jsonb_build_object(
        'id',c.id,'number',c.contract_number,'customer',c.customer,'services',c.services,
        'total',c.total,'status',c.status,'createdAt',c.created_at
      ) item from public.contracts c
    ) q),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(item order by created_at desc) from (
      select a.created_at, jsonb_build_object(
        'id',a.id,'action',a.action,'details',a.details,'createdAt',a.created_at
      ) item from public.admin_audit_log a
      where a.action like 'commerce_%' or a.action like 'payment_%'
      order by a.created_at desc limit 80
    ) q),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
grant execute on function public.get_admin_commerce_workspace() to authenticated;

create or replace function public.admin_approve_payment(target_order_id uuid, note text default '')
returns text language plpgsql security definer set search_path = public as $$
declare selected public.orders%rowtype;
declare customer public.profiles%rowtype;
declare expected_amount numeric;
declare plain_code text;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  select * into selected from public.orders where id=target_order_id for update;
  if selected.id is null then raise exception 'Order not found'; end if;
  if selected.status not in ('payment_pending','payment_review') or selected.activated_at is not null then
    raise exception 'Order is not awaiting review';
  end if;
  expected_amount := case selected.plan_code
    when 'personal' then 20 when 'specialist' then 50 when 'pro' then 100
    when 'start' then 200 when 'business' then 300 when 'organization_pro' then 500
    else null end;
  if expected_amount is null then raise exception 'Unknown tariff'; end if;
  if selected.amount_somoni <> expected_amount then
    raise exception 'Amount does not match tariff: expected % somoni', expected_amount;
  end if;
  if trim(coalesce(selected.receipt_path,'')) = '' then raise exception 'Receipt is required'; end if;

  plain_code := 'VZ-' || upper(substr(encode(gen_random_bytes(8),'hex'),1,4))
    || '-' || upper(substr(encode(gen_random_bytes(8),'hex'),1,4));
  update public.orders set activation_code_hash=encode(digest(plain_code,'sha256'),'hex'),
    activation_code_expires_at=now()+interval '7 days',reviewed_by=auth.uid(),
    reviewed_at=now(),admin_note=trim(coalesce(note,'')),rejection_reason='',
    status='payment_review',updated_at=now()
  where id=target_order_id;
  select * into customer from public.profiles where id=selected.user_id;
  perform public.queue_transactional_email(customer.email,'payment_confirmed',
    jsonb_build_object('fullName',customer.full_name,'language',customer.preferred_language,
      'number',selected.order_number,'actionUrl','/payment'));
  perform public.queue_transactional_email(customer.email,'plan_activation',
    jsonb_build_object('fullName',customer.full_name,'language',customer.preferred_language,
      'number',selected.order_number,'planCode',selected.plan_code,'code',plain_code,'actionUrl','/payment'));
  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'payment_approved',jsonb_build_object('orderId',selected.id,'number',selected.order_number,
    'planCode',selected.plan_code,'amount',selected.amount_somoni,'note',trim(coalesce(note,''))));
  return plain_code;
end;
$$;
grant execute on function public.admin_approve_payment(uuid,text) to authenticated;

create or replace function public.admin_reject_payment(target_order_id uuid, reason text)
returns void language plpgsql security definer set search_path = public as $$
declare selected public.orders%rowtype;
declare customer public.profiles%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if length(trim(coalesce(reason,''))) < 3 then raise exception 'Rejection reason is required'; end if;
  update public.orders set status='rejected',rejection_reason=trim(reason),
    activation_code_hash=null,activation_code_expires_at=null,reviewed_by=auth.uid(),
    reviewed_at=now(),updated_at=now()
  where id=target_order_id and status in ('payment_pending','payment_review')
  returning * into selected;
  if selected.id is null then raise exception 'Order is not awaiting review'; end if;
  select * into customer from public.profiles where id=selected.user_id;
  perform public.queue_transactional_email(customer.email,'payment_rejected',
    jsonb_build_object('fullName',customer.full_name,'language',customer.preferred_language,
      'number',selected.order_number,'reason',trim(reason),'actionUrl','/payment'));
  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'payment_rejected',jsonb_build_object('orderId',selected.id,'number',selected.order_number,'reason',trim(reason)));
end;
$$;
grant execute on function public.admin_reject_payment(uuid,text) to authenticated;

create or replace function public.admin_update_service_order(
  target_order_id uuid, next_status text, next_payment_status text, comment text default ''
)
returns void language plpgsql security definer set search_path = public as $$
declare selected public.service_orders%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if next_status not in ('new','clarifying','approved','in_progress','ready','completed','cancelled')
    or next_payment_status not in ('unpaid','pending','paid','refunded') then
    raise exception 'Invalid order status';
  end if;
  update public.service_orders set status=next_status,payment_status=next_payment_status,
    manager_comment=trim(coalesce(comment,'')),updated_at=now()
  where id=target_order_id returning * into selected;
  if selected.id is null then raise exception 'Service order not found'; end if;
  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'commerce_service_order_updated',
    jsonb_build_object('orderId',selected.id,'number',selected.order_number,
      'status',next_status,'paymentStatus',next_payment_status));
end;
$$;
grant execute on function public.admin_update_service_order(uuid,text,text,text) to authenticated;

create or replace function public.admin_update_contract(target_contract_id uuid, next_status text)
returns void language plpgsql security definer set search_path = public as $$
declare selected public.contracts%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if next_status not in ('draft','submitted','approved','signed','cancelled') then raise exception 'Invalid contract status'; end if;
  update public.contracts set status=next_status,
    accepted_at=case when next_status='signed' then coalesce(accepted_at,now()) else accepted_at end,
    updated_at=now()
  where id=target_contract_id returning * into selected;
  if selected.id is null then raise exception 'Contract not found'; end if;
  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'commerce_contract_updated',
    jsonb_build_object('contractId',selected.id,'number',selected.contract_number,'status',next_status));
end;
$$;
grant execute on function public.admin_update_contract(uuid,text) to authenticated;
