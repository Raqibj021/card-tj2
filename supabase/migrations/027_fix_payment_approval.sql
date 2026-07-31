-- VIZORA.TJ: make administrator payment approval transactional and reliable.
-- Migration 017 used legacy notification columns (type/message/metadata),
-- so PostgreSQL rolled back the entire approval after the tariff was activated.

create or replace function public.admin_approve_payment(target_order_id uuid, note text default '')
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected public.orders%rowtype;
  customer public.profiles%rowtype;
  expected_amount numeric;
  inferred_organization_id uuid;
  plan_expiry timestamptz := now() + interval '1 year';
  email_error text;
  notification_error text;
begin
  if not public.is_platform_admin() then
    raise exception 'Доступ разрешён только главному администратору';
  end if;

  select * into selected
  from public.orders
  where id = target_order_id
  for update;

  if selected.id is null then
    raise exception 'Заявка на оплату не найдена';
  end if;

  -- Repeated clicks must not create another subscription or extend the tariff.
  if selected.status = 'active' and selected.activated_at is not null then
    return 'already_activated';
  end if;

  if selected.status not in ('payment_pending', 'payment_review')
     or selected.activated_at is not null then
    raise exception 'Эта заявка уже не ожидает подтверждения';
  end if;

  expected_amount := case selected.plan_code
    when 'personal' then 20
    when 'specialist' then 50
    when 'pro' then 100
    when 'start' then 200
    when 'business' then 300
    when 'organization_pro' then 500
    else null
  end;

  if expected_amount is null then
    raise exception 'Неизвестный тариф: %', selected.plan_code;
  end if;

  if selected.amount_somoni <> expected_amount then
    raise exception 'Сумма не соответствует тарифу: требуется % сомони', expected_amount;
  end if;

  if trim(coalesce(selected.receipt_path, '')) = '' then
    raise exception 'К заявке не прикреплён чек';
  end if;

  -- Older organization orders can exist without organization_id. Link them
  -- to the newest matching application owned by the same customer.
  if selected.plan_code in ('start', 'business', 'organization_pro')
     and selected.organization_id is null then
    select o.id into inferred_organization_id
    from public.organizations o
    where o.owner_id = selected.user_id
      and o.plan_code = selected.plan_code
    order by o.created_at desc
    limit 1;

    if inferred_organization_id is null then
      raise exception 'Заявка организации не связана с этой оплатой';
    end if;

    selected.organization_id := inferred_organization_id;
  end if;

  update public.orders set
    organization_id = selected.organization_id,
    activation_code_hash = null,
    activation_code_expires_at = null,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    activated_at = now(),
    admin_note = trim(coalesce(note, '')),
    rejection_reason = '',
    status = 'active',
    updated_at = now()
  where id = selected.id;

  insert into public.subscriptions(profile_id, plan_code, source, starts_at, expires_at)
  values(selected.user_id, selected.plan_code, 'payment', now(), plan_expiry)
  on conflict (profile_id) do update set
    plan_code = excluded.plan_code,
    source = excluded.source,
    starts_at = excluded.starts_at,
    expires_at = excluded.expires_at;

  if selected.organization_id is not null then
    update public.organizations set
      plan_code = selected.plan_code,
      employee_limit = case selected.plan_code
        when 'start' then 20
        when 'business' then 50
        else 100
      end,
      active_until = plan_expiry,
      updated_at = now()
    where id = selected.organization_id
      and owner_id = selected.user_id;

    if not found then
      raise exception 'Организация для этой оплаты не найдена';
    end if;
  end if;

  select * into customer
  from public.profiles
  where id = selected.user_id;

  -- A secondary notification problem must never roll back a verified payment.
  begin
    insert into public.notifications(user_id, kind, title, body, action_url)
    values(
      selected.user_id,
      'payment_confirmed',
      'Оплата подтверждена',
      'Тариф активирован автоматически на один год. Код активации не требуется.',
      case
        when selected.organization_id is not null then '/organization/dashboard'
        else '/dashboard'
      end
    );
  exception when others then
    notification_error := sqlerrm;
    insert into public.admin_audit_log(admin_id, action, details)
    values(auth.uid(), 'payment_notification_failed', jsonb_build_object(
      'orderId', selected.id,
      'number', selected.order_number,
      'error', notification_error
    ));
  end;

  -- Email delivery is also secondary to the administrator's verified decision.
  begin
    if customer.email is not null and trim(customer.email) <> '' then
      perform public.queue_transactional_email(
        customer.email,
        'payment_confirmed',
        jsonb_build_object(
          'fullName', customer.full_name,
          'language', customer.preferred_language,
          'number', selected.order_number,
          'planCode', selected.plan_code,
          'autoActivated', true,
          'actionUrl', case
            when selected.organization_id is not null then '/organization/dashboard'
            else '/dashboard'
          end
        )
      );
    end if;
  exception when others then
    email_error := sqlerrm;
    insert into public.admin_audit_log(admin_id, action, details)
    values(auth.uid(), 'payment_email_queue_failed', jsonb_build_object(
      'orderId', selected.id,
      'number', selected.order_number,
      'error', email_error
    ));
  end;

  insert into public.admin_audit_log(admin_id, action, details)
  values(auth.uid(), 'payment_approved', jsonb_build_object(
    'orderId', selected.id,
    'number', selected.order_number,
    'organizationId', selected.organization_id,
    'planCode', selected.plan_code,
    'amount', selected.amount_somoni,
    'activation', 'automatic',
    'expiresAt', plan_expiry,
    'note', trim(coalesce(note, ''))
  ));

  return 'activated';
end;
$$;

revoke all on function public.admin_approve_payment(uuid, text) from public;
grant execute on function public.admin_approve_payment(uuid, text) to authenticated;
