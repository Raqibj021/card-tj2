-- VIZORA.TJ: make organization review, payment activation and workspace access
-- one consistent state machine. Run after 028_notification_center_and_badges.sql
-- and after the one-time test-data cleanup when duplicate organizations exist.

do $$
begin
  if exists (
    select 1 from public.organizations group by owner_id having count(*) > 1
  ) then
    raise exception 'Duplicate organizations detected. Run supabase/manual/cleanup_test_data_keep_murodzoda.sql first.';
  end if;
end;
$$;

create unique index if not exists organizations_one_per_owner
  on public.organizations(owner_id);

create or replace function public.submit_organization_application(
  organization_name text,
  organization_type text,
  contact_name text,
  contact_position text,
  contact_phone text,
  contact_email text,
  selected_plan text,
  requested_slug text
)
returns public.organizations
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
  current_auth_user auth.users%rowtype;
  saved_organization public.organizations%rowtype;
  normalized_plan text;
  selected_limit integer;
  unique_slug text;
  clean_phone text := regexp_replace(coalesce(contact_phone, ''), '\D', '', 'g');
  clean_email text := lower(trim(coalesce(contact_email, '')));
  clean_name text := trim(regexp_replace(coalesce(contact_name, ''), '\s+', ' ', 'g'));
begin
  if current_user_id is null then raise exception 'Сначала войдите в аккаунт.'; end if;
  select * into current_auth_user from auth.users where id = current_user_id;
  if current_auth_user.id is null then raise exception 'Аккаунт пользователя не найден.'; end if;
  if char_length(trim(coalesce(organization_name, ''))) < 2 then raise exception 'Укажите название организации.'; end if;
  if char_length(trim(coalesce(organization_type, ''))) < 2 then raise exception 'Укажите тип организации.'; end if;
  if clean_name !~ '^[[:alpha:]][[:alpha:]''’ʼ-]{1,}([[:space:]]+[[:alpha:]][[:alpha:]''’ʼ-]{1,})+$' then
    raise exception 'Укажите настоящее имя и фамилию ответственного лица.';
  end if;
  if char_length(trim(coalesce(contact_position, ''))) < 2 then raise exception 'Укажите должность ответственного лица.'; end if;
  if clean_phone !~ '^992[0-9]{9}$' then raise exception 'Введите полный номер телефона: +992 и 9 цифр.'; end if;
  if clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Введите корректную электронную почту.'; end if;

  normalized_plan := case selected_plan
    when 'start' then 'start' when 'business' then 'business'
    when 'organization_pro' then 'organization_pro' else 'start' end;
  selected_limit := case normalized_plan when 'start' then 20 when 'business' then 50 else 100 end;

  insert into public.profiles(id, full_name, email, phone)
  values(current_user_id, clean_name, clean_email, clean_phone)
  on conflict(id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = coalesce(public.profiles.phone, excluded.phone),
    updated_at = now();

  select * into saved_organization
  from public.organizations
  where owner_id = current_user_id
  for update;

  -- One account owns one organization application. Active and pending records
  -- are returned instead of silently creating a second, conflicting record.
  if saved_organization.id is not null
     and saved_organization.review_status in ('pending', 'approved', 'suspended') then
    return saved_organization;
  end if;

  if saved_organization.id is not null then
    update public.organizations set
      legal_name = trim(organization_name), display_name = trim(organization_name),
      organization_type = trim(organization_type), phone = clean_phone,
      email = clean_email, plan_code = normalized_plan,
      employee_limit = selected_limit, review_status = 'pending',
      active_until = null,
      description = jsonb_build_object('contactName', clean_name,
        'contactPosition', trim(contact_position))::text,
      updated_at = now()
    where id = saved_organization.id
    returning * into saved_organization;

    insert into public.notifications(user_id, kind, title, body, action_url)
    values(current_user_id, 'organization_resubmitted',
      'Заявка организации отправлена повторно',
      'Исправленные данные сохранены и переданы администратору.',
      '/organization/apply');
    return saved_organization;
  end if;

  unique_slug := trim(both '-' from coalesce(nullif(trim(requested_slug), ''), 'organization'))
    || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.organizations(
    owner_id, slug, legal_name, display_name, organization_type, phone, email,
    plan_code, employee_limit, review_status, description
  ) values (
    current_user_id, unique_slug, trim(organization_name), trim(organization_name),
    trim(organization_type), clean_phone, clean_email, normalized_plan,
    selected_limit, 'pending', jsonb_build_object(
      'contactName', clean_name, 'contactPosition', trim(contact_position))::text
  ) returning * into saved_organization;

  insert into public.organization_members(organization_id, profile_id, role)
  values(saved_organization.id, current_user_id, 'owner')
  on conflict(organization_id, profile_id) do update set role = 'owner';

  insert into public.notifications(user_id, kind, title, body, action_url)
  values(current_user_id, 'organization_submitted', 'Заявка организации принята',
    'Заявка сохранена. Решение администратора появится в уведомлениях.',
    '/organization/apply');
  return saved_organization;
end;
$$;

create or replace function public.admin_review_organization(
  target_organization_id uuid,
  decision public.review_status,
  note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target public.organizations%rowtype;
  active_order public.orders%rowtype;
  clean_note text := trim(coalesce(note, ''));
  notification_title text;
  notification_body text;
  notification_kind text;
  notification_action text;
  effective_active_until timestamptz;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if decision not in ('approved', 'rejected', 'changes_requested') then
    raise exception 'Unsupported organization decision';
  end if;
  if decision in ('rejected', 'changes_requested') and clean_note = '' then
    raise exception 'Укажите комментарий для пользователя.';
  end if;

  select * into target from public.organizations where id = target_organization_id for update;
  if target.id is null then raise exception 'Organization not found'; end if;

  if decision = 'approved' then
    select * into active_order from public.orders
    where organization_id = target.id and user_id = target.owner_id
      and plan_code = target.plan_code and status = 'active'
    order by activated_at desc nulls last, created_at desc limit 1;
    effective_active_until := case when active_order.id is not null then
      greatest(coalesce(target.active_until, '-infinity'::timestamptz),
        coalesce(active_order.activated_at, active_order.reviewed_at, active_order.created_at) + interval '1 year')
      else null end;
  else
    effective_active_until := null;
  end if;

  update public.organizations set
    review_status = decision,
    active_until = effective_active_until,
    employee_limit = case plan_code when 'business' then 50 when 'organization_pro' then 100 else 20 end,
    updated_at = now()
  where id = target.id;

  if decision = 'approved' and effective_active_until is not null then
    notification_kind := 'organization_approved';
    notification_title := 'Организация одобрена и тариф активен';
    notification_body := coalesce(nullif(clean_note, ''),
      'Проверка завершена. Можно создать структуру организации и добавить сотрудников.');
    notification_action := '/organization/dashboard';
  elsif decision = 'approved' then
    notification_kind := 'organization_approved';
    notification_title := 'Организация одобрена';
    notification_body := coalesce(nullif(clean_note, ''),
      'Проверка завершена. Перейдите к оплате выбранного тарифа.');
    notification_action := '/organization/apply';
  elsif decision = 'changes_requested' then
    notification_kind := 'organization_changes_requested';
    notification_title := 'Нужно исправить заявку организации';
    notification_body := clean_note;
    notification_action := '/organization/apply';
  else
    notification_kind := 'organization_rejected';
    notification_title := 'Заявка организации отклонена';
    notification_body := clean_note;
    notification_action := '/organization/apply';
  end if;

  insert into public.notifications(user_id, kind, title, body, action_url)
  values(target.owner_id, notification_kind, notification_title,
    notification_body, notification_action);

  insert into public.admin_audit_log(admin_id, action, details)
  values(auth.uid(), 'organization_reviewed', jsonb_build_object(
    'organizationId', target.id, 'from', target.review_status, 'to', decision,
    'note', clean_note, 'tariffActive', effective_active_until is not null));

  return jsonb_build_object('organizationId', target.id, 'status', decision,
    'ownerId', target.owner_id, 'tariffActive', effective_active_until is not null,
    'activeUntil', effective_active_until);
end;
$$;

create or replace function public.submit_payment_request(
  customer_name text,
  customer_phone text,
  selected_plan text,
  payment_sender_name text,
  uploaded_receipt_path text,
  target_organization_id uuid default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, storage, extensions
as $$
declare
  result public.orders%rowtype;
  target_org public.organizations%rowtype;
  expected_amount numeric(10,2);
  clean_name text := trim(coalesce(customer_name,''));
  clean_phone text := regexp_replace(coalesce(customer_phone,''), '\D', '', 'g');
  clean_sender text := trim(coalesce(payment_sender_name,''));
  clean_receipt text := trim(coalesce(uploaded_receipt_path,''));
  organization_plan boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(clean_name) not between 2 and 100 then raise exception 'Enter the customer full name'; end if;
  if clean_name !~ '^[[:alpha:]А-Яа-яЁёІіӢӣҚқӮӯҲҳҶҷҒғ'' .-]+$' then raise exception 'The full name contains invalid characters'; end if;
  if char_length(clean_phone) not between 9 and 15 then raise exception 'Enter a valid phone number'; end if;
  if char_length(clean_sender) not between 2 and 100 then raise exception 'Enter the payment sender name'; end if;

  expected_amount := case selected_plan
    when 'personal' then 20 when 'specialist' then 50 when 'pro' then 100
    when 'start' then 200 when 'business' then 300 when 'organization_pro' then 500
    else null end;
  if expected_amount is null then raise exception 'Unknown tariff'; end if;
  organization_plan := selected_plan in ('start','business','organization_pro');

  if organization_plan then
    select * into target_org from public.organizations
    where id = target_organization_id and owner_id = auth.uid() for update;
    if target_org.id is null then raise exception 'Organization application is not linked to this payment'; end if;
    if target_org.review_status <> 'approved' then raise exception 'Сначала дождитесь одобрения организации.'; end if;
    if target_org.plan_code <> selected_plan then raise exception 'Выбранный тариф не совпадает с заявкой организации.'; end if;
  elsif target_organization_id is not null then
    raise exception 'A personal tariff cannot be linked to an organization';
  end if;

  -- Idempotency: return the current order instead of opening another payment.
  select * into result from public.orders
  where user_id = auth.uid() and plan_code = selected_plan
    and organization_id is not distinct from target_organization_id
    and status in ('active','payment_pending','payment_review')
  order by case when status = 'active' then 0 else 1 end,
    activated_at desc nulls last, created_at desc
  limit 1;
  if result.id is not null then return result; end if;

  if split_part(clean_receipt,'/',1) <> auth.uid()::text or not exists (
    select 1 from storage.objects where bucket_id='payment-receipts'
      and name=clean_receipt and owner_id=auth.uid()::text
  ) then raise exception 'Payment receipt was not uploaded by this account'; end if;

  insert into public.orders(
    user_id, organization_id, order_number, plan_code, amount_somoni,
    payer_name, receipt_path, customer_snapshot, status
  ) values (
    auth.uid(), target_organization_id,
    'VZ-' || extract(year from now())::int || '-' || upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,10)),
    selected_plan, expected_amount, clean_sender, clean_receipt,
    jsonb_build_object('fullName',clean_name,'phone',clean_phone), 'payment_review'
  ) returning * into result;

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'payment_submitted',jsonb_build_object(
    'orderId',result.id,'number',result.order_number,'planCode',selected_plan,
    'organizationId',target_organization_id,'amount',expected_amount));
  return result;
end;
$$;

create or replace function public.admin_approve_payment(target_order_id uuid, note text default '')
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected public.orders%rowtype;
  customer public.profiles%rowtype;
  target_org public.organizations%rowtype;
  expected_amount numeric;
  plan_expiry timestamptz := now() + interval '1 year';
  email_error text;
  notification_error text;
begin
  if not public.is_platform_admin() then raise exception 'Доступ разрешён только главному администратору'; end if;
  select * into selected from public.orders where id = target_order_id for update;
  if selected.id is null then raise exception 'Заявка на оплату не найдена'; end if;
  if selected.status = 'active' and selected.activated_at is not null then return 'already_activated'; end if;
  if selected.status not in ('payment_pending', 'payment_review') or selected.activated_at is not null then
    raise exception 'Эта заявка уже не ожидает подтверждения';
  end if;

  expected_amount := case selected.plan_code
    when 'personal' then 20 when 'specialist' then 50 when 'pro' then 100
    when 'start' then 200 when 'business' then 300 when 'organization_pro' then 500
    else null end;
  if expected_amount is null then raise exception 'Неизвестный тариф: %', selected.plan_code; end if;
  if selected.amount_somoni <> expected_amount then raise exception 'Сумма не соответствует тарифу: требуется % сомони', expected_amount; end if;
  if trim(coalesce(selected.receipt_path, '')) = '' then raise exception 'К заявке не прикреплён чек'; end if;

  if selected.plan_code in ('start','business','organization_pro') then
    if selected.organization_id is null then raise exception 'Заявка организации не связана с этой оплатой'; end if;
    select * into target_org from public.organizations
    where id = selected.organization_id and owner_id = selected.user_id for update;
    if target_org.id is null then raise exception 'Организация для этой оплаты не найдена'; end if;
    if target_org.review_status <> 'approved' then raise exception 'Сначала одобрите заявку организации'; end if;
    if target_org.plan_code <> selected.plan_code then raise exception 'Тариф оплаты не совпадает с тарифом организации'; end if;
  elsif selected.organization_id is not null then
    raise exception 'Личный тариф ошибочно связан с организацией';
  end if;

  update public.orders set
    activation_code_hash = null, activation_code_expires_at = null,
    reviewed_by = auth.uid(), reviewed_at = now(), activated_at = now(),
    expires_at = plan_expiry, admin_note = trim(coalesce(note, '')),
    rejection_reason = '', status = 'active', updated_at = now()
  where id = selected.id;

  insert into public.subscriptions(profile_id, plan_code, source, starts_at, expires_at)
  values(selected.user_id, selected.plan_code, 'payment', now(), plan_expiry)
  on conflict(profile_id) do update set plan_code=excluded.plan_code,
    source=excluded.source, starts_at=excluded.starts_at, expires_at=excluded.expires_at;

  if target_org.id is not null then
    update public.organizations set
      plan_code = selected.plan_code,
      employee_limit = case selected.plan_code when 'start' then 20 when 'business' then 50 else 100 end,
      active_until = plan_expiry, updated_at = now()
    where id = target_org.id;
  end if;

  select * into customer from public.profiles where id = selected.user_id;
  begin
    insert into public.notifications(user_id, kind, title, body, action_url)
    values(selected.user_id, 'payment_confirmed', 'Оплата подтверждена',
      case when target_org.id is not null
        then 'Тариф организации активирован на один год. Можно создать структуру и добавить сотрудников.'
        else 'Тариф активирован автоматически на один год.' end,
      case when target_org.id is not null then '/organization/dashboard' else '/dashboard' end);
  exception when others then
    notification_error := sqlerrm;
    insert into public.admin_audit_log(admin_id,action,details)
    values(auth.uid(),'payment_notification_failed',jsonb_build_object('orderId',selected.id,'error',notification_error));
  end;

  begin
    if customer.email is not null and trim(customer.email) <> '' then
      perform public.queue_transactional_email(customer.email,'payment_confirmed',
        jsonb_build_object('fullName',customer.full_name,'language',customer.preferred_language,
          'number',selected.order_number,'planCode',selected.plan_code,'autoActivated',true,
          'actionUrl',case when target_org.id is not null then '/organization/dashboard' else '/dashboard' end));
    end if;
  exception when others then
    email_error := sqlerrm;
    insert into public.admin_audit_log(admin_id,action,details)
    values(auth.uid(),'payment_email_queue_failed',jsonb_build_object('orderId',selected.id,'error',email_error));
  end;

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'payment_approved',jsonb_build_object(
    'orderId',selected.id,'number',selected.order_number,'organizationId',selected.organization_id,
    'planCode',selected.plan_code,'amount',selected.amount_somoni,'expiresAt',plan_expiry));
  return 'activated';
end;
$$;

create or replace function public.get_organization_workspace(target_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select jsonb_build_object(
  'organization', to_jsonb(o),
  'departments', coalesce((
    select jsonb_agg(to_jsonb(d) order by d.sort_order, d.name)
    from public.departments d where d.organization_id = o.id
  ), '[]'::jsonb),
  'employees', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',a.id,'profileId',a.profile_id,'name',coalesce(nullif(c.full_name,''),p.full_name),
      'email',coalesce(nullif(c.contacts->>'email',''),p.email,''),
      'phone',coalesce(c.contacts->>'phone',''),'position',a.position,
      'departmentId',a.department_id,'department',d.name,'isPublic',a.is_public,
      'cardSlug',c.slug,'cardStatus',c.review_status
    ) order by coalesce(nullif(c.full_name,''),p.full_name))
    from public.employee_assignments a join public.profiles p on p.id=a.profile_id
    left join public.departments d on d.id=a.department_id
    left join public.cards c on c.owner_id=a.profile_id
    where a.organization_id=o.id
  ), '[]'::jsonb),
  'invitations', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id',i.id,'name',i.full_name,'email',i.email,'phone',i.phone,
      'position',i.position,'departmentId',i.department_id,
      'status',i.status,'expiresAt',i.expires_at) order by i.created_at desc)
    from public.organization_invitations i
    where i.organization_id=o.id and i.status='pending' and i.expires_at>now()
  ), '[]'::jsonb)
)
from public.organizations o
where o.id=target_organization_id and public.is_organization_admin(o.id)
  and o.review_status='approved' and o.active_until>now();
$$;

-- The protected invitation functions in migration 025 set the session flag
-- vizora.organization_managed and create/update employee cards as approved.
-- This is intentional: the organization owner is responsible for employees;
-- platform moderation is not required for organization-managed cards.

revoke all on function public.submit_organization_application(text,text,text,text,text,text,text,text) from public;
revoke all on function public.admin_review_organization(uuid,public.review_status,text) from public;
revoke all on function public.submit_payment_request(text,text,text,text,text,uuid) from public;
revoke all on function public.admin_approve_payment(uuid,text) from public;
revoke all on function public.get_organization_workspace(uuid) from public;
grant execute on function public.submit_organization_application(text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.admin_review_organization(uuid,public.review_status,text) to authenticated;
grant execute on function public.submit_payment_request(text,text,text,text,text,uuid) to authenticated;
grant execute on function public.admin_approve_payment(uuid,text) to authenticated;
grant execute on function public.get_organization_workspace(uuid) to authenticated;
