-- VIZORA.TJ: persistent organization applications, admin decisions and
-- organization-managed employee cards.
-- Run after 024_fix_card_review_notifications.sql.

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
  if current_user_id is null then
    raise exception 'Сначала войдите в аккаунт.';
  end if;

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
    when 'start' then 'start'
    when 'business' then 'business'
    when 'organization_pro' then 'organization_pro'
    else 'start'
  end;
  selected_limit := case normalized_plan when 'start' then 20 when 'business' then 50 else 100 end;

  insert into public.profiles (id, full_name, email, phone)
  values (current_user_id, clean_name, clean_email, clean_phone)
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    phone = coalesce(public.profiles.phone, excluded.phone),
    updated_at = now();

  select o.* into saved_organization
  from public.organizations o
  where o.owner_id = current_user_id
  order by o.created_at desc
  limit 1
  for update;

  -- A pending/approved application is authoritative and cannot be duplicated.
  if saved_organization.id is not null
    and saved_organization.review_status in ('pending', 'approved', 'suspended') then
    return saved_organization;
  end if;

  -- Rejected applications are corrected in place, preserving their history.
  if saved_organization.id is not null then
    update public.organizations set
      legal_name = trim(organization_name),
      display_name = trim(organization_name),
      organization_type = trim(organization_type),
      phone = clean_phone,
      email = clean_email,
      plan_code = normalized_plan,
      employee_limit = selected_limit,
      review_status = 'pending',
      active_until = null,
      description = jsonb_build_object(
        'contactName', clean_name,
        'contactPosition', trim(contact_position)
      )::text,
      updated_at = now()
    where id = saved_organization.id
    returning * into saved_organization;

    insert into public.notifications(user_id, kind, title, body, action_url)
    values (
      current_user_id,
      'organization_resubmitted',
      'Заявка организации отправлена повторно',
      'Исправленные данные сохранены и переданы администратору.',
      '/organization/apply'
    );
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
      'contactName', clean_name,
      'contactPosition', trim(contact_position)
    )::text
  )
  returning * into saved_organization;

  insert into public.organization_members(organization_id, profile_id, role)
  values(saved_organization.id, current_user_id, 'owner')
  on conflict(organization_id, profile_id) do update set role = 'owner';

  insert into public.notifications(user_id, kind, title, body, action_url)
  values (
    current_user_id,
    'organization_submitted',
    'Заявка организации принята',
    'Заявка сохранена. Статус можно проверять в разделе «Организации».',
    '/organization/apply'
  );

  return saved_organization;
end;
$$;

revoke all on function public.submit_organization_application(text,text,text,text,text,text,text,text) from public;
grant execute on function public.submit_organization_application(text,text,text,text,text,text,text,text) to authenticated;

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
  clean_note text := trim(coalesce(note, ''));
  notification_title text;
  notification_body text;
  notification_kind text;
  notification_action text;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if decision not in ('approved', 'rejected', 'changes_requested') then raise exception 'Unsupported organization decision'; end if;
  if decision in ('rejected', 'changes_requested') and clean_note = '' then
    raise exception 'Укажите комментарий для пользователя.';
  end if;

  select * into target from public.organizations where id = target_organization_id for update;
  if target.id is null then raise exception 'Organization not found'; end if;

  update public.organizations set
    review_status = decision,
    active_until = case
      when decision = 'approved' then coalesce(
        case when active_until > now() then active_until end,
        now() + interval '1 year'
      )
      else null
    end,
    employee_limit = case plan_code when 'business' then 50 when 'organization_pro' then 100 else 20 end,
    updated_at = now()
  where id = target.id;

  if decision = 'approved' then
    notification_kind := 'organization_approved';
    notification_title := 'Организация одобрена';
    notification_body := coalesce(nullif(clean_note, ''), 'Заявка одобрена. Теперь можно создать структуру и добавить сотрудников.');
    notification_action := '/organization/dashboard';
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
  values(target.owner_id, notification_kind, notification_title, notification_body, notification_action);

  insert into public.admin_audit_log(admin_id, action, details)
  values(auth.uid(), 'organization_reviewed', jsonb_build_object(
    'organizationId', target.id,
    'from', target.review_status,
    'to', decision,
    'note', clean_note
  ));

  return jsonb_build_object(
    'organizationId', target.id,
    'status', decision,
    'ownerId', target.owner_id
  );
end;
$$;

revoke all on function public.admin_review_organization(uuid,public.review_status,text) from public;
grant execute on function public.admin_review_organization(uuid,public.review_status,text) to authenticated;

-- Organization employee cards are approved by the responsible organization
-- manager and therefore bypass platform moderation only inside protected RPCs.
create or replace function public.validate_and_protect_card()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  primary_phone text := regexp_replace(coalesce(new.contacts->>'phone',''),'[^0-9]','','g');
  second_phone text := regexp_replace(coalesce(new.contacts->>'secondPhone',''),'[^0-9]','','g');
  whatsapp_phone text := regexp_replace(coalesce(new.contacts->>'whatsapp',''),'[^0-9]','','g');
  contact_email text := lower(trim(coalesce(new.contacts->>'email','')));
  is_organization_managed boolean := false;
  is_privileged boolean;
  material_changed boolean := false;
begin
  is_organization_managed :=
    coalesce(current_setting('vizora.organization_managed', true), '') = 'on'
    and exists(
      select 1
      from public.organization_members m
      join public.organizations o on o.id = m.organization_id
      where m.profile_id = new.owner_id
        and o.review_status = 'approved'
        and o.active_until > now()
        and o.display_name = new.organization_name
    );
  is_privileged := auth.role() = 'service_role' or public.is_staff() or is_organization_managed;

  new.full_name := trim(regexp_replace(coalesce(new.full_name,''),'\s+',' ','g'));
  new.position := trim(regexp_replace(coalesce(new.position,''),'\s+',' ','g'));
  new.organization_name := trim(regexp_replace(coalesce(new.organization_name,''),'\s+',' ','g'));

  if new.full_name !~ '^[[:alpha:]][[:alpha:]''’ʼ-]{1,}([[:space:]]+[[:alpha:]][[:alpha:]''’ʼ-]{1,})+$' then
    raise exception 'Введите настоящее имя и фамилию';
  end if;
  if length(new.position) < 2 then raise exception 'Укажите должность'; end if;
  if length(new.organization_name) < 2 then raise exception 'Укажите место работы'; end if;
  if primary_phone !~ '^992[0-9]{9}$' then raise exception 'Введите полный номер телефона: +992 и 9 цифр'; end if;
  if second_phone <> '' and second_phone !~ '^992[0-9]{9}$' then raise exception 'Второй номер телефона заполнен неверно'; end if;
  if whatsapp_phone <> '' and whatsapp_phone !~ '^992[0-9]{9}$' then raise exception 'Номер WhatsApp заполнен неверно'; end if;
  if contact_email <> '' and contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Электронная почта заполнена неверно';
  end if;

  if tg_op = 'INSERT' then
    if not is_privileged and new.review_status = 'approved' then
      new.review_status := 'draft';
      new.visibility := 'private';
      new.verified_at := null;
      new.published_at := null;
    end if;
  else
    material_changed :=
      old.full_name is distinct from new.full_name or
      old.position is distinct from new.position or
      old.organization_name is distinct from new.organization_name or
      old.description is distinct from new.description or
      old.photo_path is distinct from new.photo_path or
      old.contacts is distinct from new.contacts or
      old.address is distinct from new.address;

    if not is_privileged then
      if old.review_status <> 'approved' and new.review_status = 'approved' then
        raise exception 'Только администратор может одобрить визитку';
      end if;
      if old.review_status = 'approved' and material_changed then
        new.review_status := 'pending';
        new.visibility := 'private';
        new.verified_at := null;
        new.published_at := null;
      end if;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.accept_organization_invitation(plain_code text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invitation public.organization_invitations%rowtype;
  target_org public.organizations%rowtype;
  current_count integer;
  new_slug text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select i.* into invitation
  from public.organization_invitations i
  join auth.users u on u.id = auth.uid()
  where lower(i.email) = lower(u.email)
    and i.token_hash = encode(digest(upper(trim(plain_code)), 'sha256'), 'hex')
    and i.status = 'pending'
    and i.expires_at > now()
  limit 1
  for update of i;

  if invitation.id is null then raise exception 'Invalid or expired invitation'; end if;
  select * into target_org from public.organizations where id = invitation.organization_id for update;
  if target_org.review_status <> 'approved' or target_org.active_until is null or target_org.active_until <= now() then
    raise exception 'Organization tariff is not active';
  end if;

  select count(*) into current_count from public.employee_assignments where organization_id = invitation.organization_id;
  if current_count >= target_org.employee_limit then raise exception 'Employee tariff limit reached'; end if;
  if invitation.department_id is not null and not exists(
    select 1 from public.departments where id = invitation.department_id and organization_id = invitation.organization_id
  ) then raise exception 'Invitation department is no longer available'; end if;

  insert into public.organization_members(organization_id, profile_id, role)
  values(invitation.organization_id, auth.uid(), 'employee')
  on conflict(organization_id, profile_id) do update set role = 'employee';

  insert into public.employee_assignments(organization_id, department_id, profile_id, position, is_public)
  values(invitation.organization_id, invitation.department_id, auth.uid(), invitation.position, true)
  on conflict(organization_id, profile_id) do update set
    department_id = excluded.department_id,
    position = excluded.position,
    is_public = true;

  perform set_config('vizora.organization_managed', 'on', true);
  new_slug := regexp_replace(lower(coalesce(invitation.full_name, 'employee')), '[^a-z0-9]+', '-', 'g')
    || '-' || substr(auth.uid()::text, 1, 6);

  insert into public.cards(
    owner_id, slug, full_name, position, organization_name, contacts,
    theme, template, visibility, review_status, verified_at, published_at
  ) values (
    auth.uid(), new_slug, invitation.full_name, invitation.position, target_org.display_name,
    jsonb_build_object('phone', invitation.phone, 'email', invitation.email),
    target_org.brand_theme, 'executive', 'public_organization', 'approved', now(), now()
  )
  on conflict(owner_id) do update set
    full_name = excluded.full_name,
    organization_name = excluded.organization_name,
    position = excluded.position,
    contacts = public.cards.contacts || excluded.contacts,
    visibility = 'public_organization',
    review_status = 'approved',
    verified_at = now(),
    published_at = now(),
    updated_at = now();

  update public.organization_invitations set
    status = 'accepted',
    accepted_by = auth.uid(),
    accepted_at = now()
  where id = invitation.id;

  insert into public.notifications(user_id, kind, title, body, action_url)
  values(
    auth.uid(),
    'organization_joined',
    'Вы присоединились к организации',
    target_org.display_name || '. Фирменная визитка активирована организацией.',
    '/dashboard'
  );
  return invitation.organization_id;
end;
$$;

create or replace function public.update_organization_employee_card(
  target_assignment_id uuid,
  employee_name text,
  employee_position text,
  employee_phone text,
  employee_email text,
  target_department_id uuid default null,
  employee_is_public boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment public.employee_assignments%rowtype;
  target_org public.organizations%rowtype;
  clean_name text := trim(regexp_replace(coalesce(employee_name, ''), '\s+', ' ', 'g'));
  clean_position text := trim(coalesce(employee_position, ''));
  clean_phone text := regexp_replace(coalesce(employee_phone, ''), '\D', '', 'g');
  clean_email text := lower(trim(coalesce(employee_email, '')));
begin
  select * into assignment from public.employee_assignments where id = target_assignment_id;
  if assignment.id is null then raise exception 'Employee not found'; end if;
  target_org := public.assert_organization_manager(assignment.organization_id);
  if target_org.review_status <> 'approved' or target_org.active_until is null or target_org.active_until <= now() then
    raise exception 'Organization tariff is not active';
  end if;
  if clean_name !~ '^[[:alpha:]][[:alpha:]''’ʼ-]{1,}([[:space:]]+[[:alpha:]][[:alpha:]''’ʼ-]{1,})+$' then
    raise exception 'Enter the employee full name';
  end if;
  if char_length(clean_position) not between 2 and 100 then raise exception 'Enter the employee position'; end if;
  if clean_phone !~ '^992[0-9]{9}$' then raise exception 'Enter a valid Tajikistan phone number'; end if;
  if clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid employee email'; end if;
  if target_department_id is not null and not exists(
    select 1 from public.departments where id = target_department_id and organization_id = assignment.organization_id
  ) then raise exception 'Department belongs to another organization'; end if;

  update public.employee_assignments set
    position = clean_position,
    department_id = target_department_id,
    is_public = employee_is_public
  where id = target_assignment_id;

  perform set_config('vizora.organization_managed', 'on', true);
  update public.cards set
    full_name = clean_name,
    position = clean_position,
    organization_name = target_org.display_name,
    contacts = contacts || jsonb_build_object('phone', clean_phone, 'email', clean_email),
    visibility = case when employee_is_public then 'public_organization'::public.card_visibility else 'organization'::public.card_visibility end,
    review_status = 'approved',
    verified_at = now(),
    published_at = now(),
    updated_at = now()
  where owner_id = assignment.profile_id;
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
      'id', a.id,
      'profileId', a.profile_id,
      'name', coalesce(nullif(c.full_name, ''), p.full_name),
      'email', coalesce(nullif(c.contacts->>'email', ''), p.email, ''),
      'phone', coalesce(c.contacts->>'phone', ''),
      'position', a.position,
      'departmentId', a.department_id,
      'department', d.name,
      'isPublic', a.is_public,
      'cardSlug', c.slug,
      'cardStatus', c.review_status
    ) order by coalesce(nullif(c.full_name, ''), p.full_name))
    from public.employee_assignments a
    join public.profiles p on p.id = a.profile_id
    left join public.departments d on d.id = a.department_id
    left join public.cards c on c.owner_id = a.profile_id
    where a.organization_id = o.id
  ), '[]'::jsonb),
  'invitations', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', i.id,
      'name', i.full_name,
      'email', i.email,
      'phone', i.phone,
      'position', i.position,
      'departmentId', i.department_id,
      'status', i.status,
      'expiresAt', i.expires_at
    ) order by i.created_at desc)
    from public.organization_invitations i
    where i.organization_id = o.id and i.status = 'pending' and i.expires_at > now()
  ), '[]'::jsonb)
)
from public.organizations o
where o.id = target_organization_id
  and public.is_organization_admin(o.id);
$$;

create or replace function public.get_public_organization(target_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select jsonb_build_object(
  'organization', jsonb_build_object(
    'id', o.id,
    'slug', o.slug,
    'name', o.display_name,
    'description', o.description,
    'logo', o.logo_path,
    'phone', o.phone,
    'email', o.email,
    'address', o.address
  ),
  'departments', coalesce((
    select jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'parentId', d.parent_id) order by d.sort_order, d.name)
    from public.departments d where d.organization_id = o.id
  ), '[]'::jsonb),
  'employees', coalesce((
    select jsonb_agg(jsonb_build_object(
      'name', c.full_name,
      'position', c.position,
      'departmentId', a.department_id,
      'slug', c.slug,
      'photo', c.photo_path
    ) order by c.full_name)
    from public.employee_assignments a
    join public.cards c on c.owner_id = a.profile_id
      and c.review_status = 'approved'
      and c.visibility in ('organization', 'public_organization')
    where a.organization_id = o.id and a.is_public
  ), '[]'::jsonb)
)
from public.organizations o
where o.slug = lower(trim(target_slug))
  and o.review_status = 'approved'
  and o.active_until > now();
$$;

-- The administrator sees the full application, the custom structure and all
-- employee cards before making a decision.  The public site never receives
-- these private fields through this function.
create or replace function public.get_admin_organization_detail(target_organization_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required';
  end if;

  select jsonb_build_object(
    'id', o.id,
    'name', o.display_name,
    'legalName', o.legal_name,
    'slug', o.slug,
    'status', o.review_status,
    'organizationType', o.organization_type,
    'phone', coalesce(o.phone, ''),
    'email', coalesce(o.email, ''),
    'planCode', coalesce(o.plan_code, ''),
    'employeeLimit', o.employee_limit,
    'ownerName', owner.full_name,
    'ownerEmail', coalesce(owner.email, ''),
    'employees', (select count(*) from public.employee_assignments e where e.organization_id = o.id),
    'departments', (select count(*) from public.departments d where d.organization_id = o.id),
    'cards', (
      select count(*)
      from public.employee_assignments e
      join public.cards c on c.owner_id = e.profile_id
      where e.organization_id = o.id
    ),
    'activeUntil', o.active_until,
    'createdAt', o.created_at,
    'structure', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', d.id,
        'name', d.name,
        'parentId', d.parent_id,
        'employees', (select count(*) from public.employee_assignments e where e.department_id = d.id)
      ) order by d.sort_order, d.name)
      from public.departments d
      where d.organization_id = o.id
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'name', coalesce(nullif(c.full_name, ''), p.full_name),
        'email', coalesce(nullif(c.contacts->>'email', ''), p.email, ''),
        'phone', coalesce(c.contacts->>'phone', ''),
        'position', e.position,
        'department', coalesce(d.name, ''),
        'cardSlug', coalesce(c.slug, ''),
        'cardStatus', coalesce(c.review_status::text, ''),
        'isPublic', e.is_public
      ) order by coalesce(nullif(c.full_name, ''), p.full_name))
      from public.employee_assignments e
      join public.profiles p on p.id = e.profile_id
      left join public.departments d on d.id = e.department_id
      left join public.cards c on c.owner_id = e.profile_id
      where e.organization_id = o.id
    ), '[]'::jsonb)
  )
  into result
  from public.organizations o
  join public.profiles owner on owner.id = o.owner_id
  where o.id = target_organization_id;

  if result is null then
    raise exception 'Organization not found';
  end if;
  return result;
end;
$$;

grant execute on function public.accept_organization_invitation(text) to authenticated;
grant execute on function public.update_organization_employee_card(uuid,text,text,text,text,uuid,boolean) to authenticated;
grant execute on function public.get_organization_workspace(uuid) to authenticated;
grant execute on function public.get_public_organization(text) to anon, authenticated;
grant execute on function public.get_admin_organization_detail(uuid) to authenticated;
