-- Creates organization applications atomically and repairs profiles missing
-- from accounts registered before the profile trigger was installed.

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
  created_organization public.organizations%rowtype;
  normalized_plan text;
  selected_limit integer;
  unique_slug text;
begin
  if current_user_id is null then
    raise exception 'Сначала войдите в аккаунт.';
  end if;

  select * into current_auth_user
  from auth.users
  where id = current_user_id;

  if current_auth_user.id is null then
    raise exception 'Аккаунт пользователя не найден.';
  end if;

  if length(trim(organization_name)) < 2 then
    raise exception 'Укажите название организации.';
  end if;

  normalized_plan := case selected_plan
    when 'start' then 'start'
    when 'business' then 'business'
    when 'organization_pro' then 'organization_pro'
    else 'start'
  end;

  selected_limit := case normalized_plan
    when 'start' then 20
    when 'business' then 50
    else 100
  end;

  insert into public.profiles (id, full_name, email)
  values (
    current_user_id,
    coalesce(nullif(trim(contact_name), ''), coalesce(current_auth_user.raw_user_meta_data->>'full_name', '')),
    coalesce(nullif(trim(contact_email), ''), current_auth_user.email)
  )
  on conflict (id) do nothing;

  unique_slug := trim(both '-' from coalesce(nullif(trim(requested_slug), ''), 'organization'))
    || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.organizations (
    owner_id,
    slug,
    legal_name,
    display_name,
    organization_type,
    phone,
    email,
    plan_code,
    employee_limit,
    review_status,
    description
  )
  values (
    current_user_id,
    unique_slug,
    trim(organization_name),
    trim(organization_name),
    trim(organization_type),
    trim(contact_phone),
    trim(contact_email),
    normalized_plan,
    selected_limit,
    'pending',
    jsonb_build_object(
      'contactName', trim(contact_name),
      'contactPosition', trim(contact_position)
    )::text
  )
  returning * into created_organization;

  insert into public.organization_members (organization_id, profile_id, role)
  values (created_organization.id, current_user_id, 'owner')
  on conflict (organization_id, profile_id) do update set role = 'owner';

  return created_organization;
end;
$$;

revoke all on function public.submit_organization_application(text, text, text, text, text, text, text, text) from public;
grant execute on function public.submit_organization_application(text, text, text, text, text, text, text, text) to authenticated;
