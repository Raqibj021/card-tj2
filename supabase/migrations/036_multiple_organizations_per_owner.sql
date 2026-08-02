-- VIZORA.TJ: allow one account to own several independently paid organizations.
-- Run after 035_specialist_submission_integrity.sql.

drop index if exists public.organizations_one_per_owner;

drop function if exists public.submit_organization_application(text, text, text, text, text, text, text, text);

create or replace function public.submit_organization_application(
  organization_name text,
  organization_type text,
  contact_name text,
  contact_position text,
  contact_phone text,
  contact_email text,
  selected_plan text,
  requested_slug text,
  create_new boolean default false
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

  normalized_plan := case selected_plan when 'start' then 'start' when 'business' then 'business' when 'organization_pro' then 'organization_pro' else 'start' end;
  selected_limit := case normalized_plan when 'start' then 20 when 'business' then 50 else 100 end;

  insert into public.profiles(id, full_name, email, phone)
  values(current_user_id, clean_name, clean_email, clean_phone)
  on conflict(id) do update set full_name = excluded.full_name, email = excluded.email,
    phone = coalesce(public.profiles.phone, excluded.phone), updated_at = now();

  if not create_new then
    select * into saved_organization
    from public.organizations
    where owner_id = current_user_id and review_status in ('rejected', 'changes_requested')
    order by updated_at desc limit 1 for update;
  end if;

  if saved_organization.id is not null then
    update public.organizations set
      legal_name = trim(organization_name), display_name = trim(organization_name),
      organization_type = trim(organization_type), phone = clean_phone, email = clean_email,
      plan_code = normalized_plan, employee_limit = selected_limit, review_status = 'pending',
      active_until = null, description = jsonb_build_object('contactName', clean_name,
        'contactPosition', trim(contact_position))::text, updated_at = now()
    where id = saved_organization.id returning * into saved_organization;
  else
    unique_slug := trim(both '-' from coalesce(nullif(trim(requested_slug), ''), 'organization'))
      || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
    insert into public.organizations(
      owner_id, slug, legal_name, display_name, organization_type, phone, email,
      plan_code, employee_limit, review_status, description
    ) values (
      current_user_id, unique_slug, trim(organization_name), trim(organization_name),
      trim(organization_type), clean_phone, clean_email, normalized_plan, selected_limit,
      'pending', jsonb_build_object('contactName', clean_name,
        'contactPosition', trim(contact_position))::text
    ) returning * into saved_organization;
    insert into public.organization_members(organization_id, profile_id, role)
    values(saved_organization.id, current_user_id, 'owner')
    on conflict(organization_id, profile_id) do update set role = 'owner';
  end if;

  insert into public.notifications(user_id, kind, title, body, action_url)
  values(current_user_id, 'organization_submitted', 'Заявка организации принята',
    'Заявка сохранена. Эта организация проходит отдельную проверку и оплачивается отдельно.',
    '/organization/apply');
  return saved_organization;
end;
$$;

grant execute on function public.submit_organization_application(text, text, text, text, text, text, text, text, boolean) to authenticated;
