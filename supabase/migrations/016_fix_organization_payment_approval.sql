-- VIZORA.TJ: reliable organization payment approval.
-- Payment approval must not be rolled back when email delivery is temporarily unavailable.
-- Run after 015_admin_cards.sql.

create or replace function public.admin_approve_payment(target_order_id uuid, note text default '')
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare selected public.orders%rowtype;
declare customer public.profiles%rowtype;
declare expected_amount numeric;
declare plain_code text;
declare inferred_organization_id uuid;
declare email_error text;
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
  if expected_amount is null then raise exception 'Unknown tariff: %', selected.plan_code; end if;
  if selected.amount_somoni <> expected_amount then
    raise exception 'Amount does not match tariff: expected % somoni', expected_amount;
  end if;
  if trim(coalesce(selected.receipt_path,'')) = '' then raise exception 'Receipt is required'; end if;

  -- Older organization orders could be saved without organization_id.
  -- Link them to the newest matching organization owned by the customer.
  if selected.plan_code in ('start','business','organization_pro') and selected.organization_id is null then
    select o.id into inferred_organization_id
    from public.organizations o
    where o.owner_id=selected.user_id and o.plan_code=selected.plan_code
    order by o.created_at desc limit 1;
    if inferred_organization_id is null then
      raise exception 'Organization application is not linked to this payment';
    end if;
    update public.orders set organization_id=inferred_organization_id where id=selected.id;
    selected.organization_id := inferred_organization_id;
  end if;

  plain_code := 'VZ-' || upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,4))
    || '-' || upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,4));

  update public.orders set
    activation_code_hash=encode(extensions.digest(plain_code,'sha256'),'hex'),
    activation_code_expires_at=now()+interval '7 days',
    reviewed_by=auth.uid(),reviewed_at=now(),
    admin_note=trim(coalesce(note,'')),rejection_reason='',
    status='payment_review',updated_at=now()
  where id=selected.id;

  select * into customer from public.profiles where id=selected.user_id;

  -- Email is secondary: a temporary mail problem must never cancel an approved payment.
  begin
    perform public.queue_transactional_email(customer.email,'payment_confirmed',
      jsonb_build_object('fullName',customer.full_name,'language',customer.preferred_language,
        'number',selected.order_number,'actionUrl','/payment'));
    perform public.queue_transactional_email(customer.email,'plan_activation',
      jsonb_build_object('fullName',customer.full_name,'language',customer.preferred_language,
        'number',selected.order_number,'planCode',selected.plan_code,'code',plain_code,'actionUrl','/payment'));
  exception when others then
    email_error := sqlerrm;
    insert into public.admin_audit_log(admin_id,action,details)
    values(auth.uid(),'payment_email_queue_failed',jsonb_build_object(
      'orderId',selected.id,'number',selected.order_number,'error',email_error
    ));
  end;

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'payment_approved',jsonb_build_object(
    'orderId',selected.id,'number',selected.order_number,
    'organizationId',selected.organization_id,'planCode',selected.plan_code,
    'amount',selected.amount_somoni,'note',trim(coalesce(note,''))
  ));
  return plain_code;
end;
$$;

grant execute on function public.admin_approve_payment(uuid,text) to authenticated;

