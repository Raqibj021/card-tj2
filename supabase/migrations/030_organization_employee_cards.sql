-- Corporate employee cards that do not require a separate user account.
-- The authorized organization manager owns the data and cards become active
-- automatically while the approved organization tariff is active.

alter table public.employee_assignments alter column profile_id drop not null;
alter table public.employee_assignments
  add column if not exists slug text,
  add column if not exists full_name text not null default '',
  add column if not exists description text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists second_phone text not null default '',
  add column if not exists whatsapp text not null default '',
  add column if not exists telegram text not null default '',
  add column if not exists instagram text not null default '',
  add column if not exists facebook text not null default '',
  add column if not exists email text not null default '',
  add column if not exists website text not null default '',
  add column if not exists address text not null default '',
  add column if not exists photo_path text not null default '',
  add column if not exists company_logo_path text not null default '',
  add column if not exists language text not null default 'ru',
  add column if not exists theme text not null default 'teal',
  add column if not exists template text not null default 'executive',
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();

update public.employee_assignments a set
  slug = coalesce(nullif(c.slug, ''), 'employee-' || substr(replace(a.id::text, '-', ''), 1, 16)),
  full_name = coalesce(nullif(c.full_name, ''), p.full_name, ''),
  description = coalesce(c.description, ''),
  phone = coalesce(c.contacts->>'phone', ''),
  second_phone = coalesce(c.contacts->>'secondPhone', ''),
  whatsapp = coalesce(c.contacts->>'whatsapp', c.contacts->>'phone', ''),
  telegram = coalesce(c.contacts->>'telegram', ''),
  instagram = coalesce(c.contacts->>'instagram', ''),
  facebook = coalesce(c.contacts->>'facebook', ''),
  email = coalesce(c.contacts->>'email', p.email, ''),
  website = coalesce(c.contacts->>'website', ''),
  address = coalesce(c.contacts->>'address', ''),
  photo_path = coalesce(c.photo_path, ''),
  company_logo_path = coalesce(c.contacts->>'companyLogo', ''),
  language = coalesce(c.language, 'ru'),
  theme = coalesce(c.theme, 'teal'),
  template = coalesce(c.template, 'executive')
from public.profiles p
left join public.cards c on c.owner_id = p.id
where a.profile_id = p.id and (a.slug is null or a.full_name = '');

update public.employee_assignments
set slug = 'employee-' || substr(replace(id::text, '-', ''), 1, 16)
where slug is null or trim(slug) = '';

create unique index if not exists employee_assignments_slug_unique
  on public.employee_assignments (lower(slug));

-- Remove the legacy six-field overload so every client uses the complete card contract.
drop function if exists public.update_organization_employee_card(uuid,text,text,text,text,uuid,boolean);

create or replace function public.create_organization_employee_card(
  target_organization_id uuid,
  employee_name text,
  employee_position text,
  employee_phone text,
  employee_whatsapp text,
  target_department_id uuid default null,
  employee_second_phone text default '',
  employee_email text default '',
  employee_website text default '',
  employee_address text default '',
  employee_telegram text default '',
  employee_instagram text default '',
  employee_facebook text default '',
  employee_description text default '',
  employee_photo text default '',
  employee_company_logo text default '',
  employee_language text default 'ru',
  employee_theme text default 'teal',
  employee_template text default 'executive'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o public.organizations%rowtype;
  result public.employee_assignments%rowtype;
  clean_name text := trim(regexp_replace(coalesce(employee_name, ''), '\s+', ' ', 'g'));
  clean_position text := trim(coalesce(employee_position, ''));
  clean_phone text := regexp_replace(coalesce(employee_phone, ''), '\D', '', 'g');
  clean_whatsapp text := regexp_replace(coalesce(employee_whatsapp, ''), '\D', '', 'g');
  current_count integer;
begin
  o := public.assert_organization_manager(target_organization_id);
  if o.review_status <> 'approved' or o.active_until is null or o.active_until <= now() then
    raise exception 'Тариф организации не активен';
  end if;
  select count(*) into current_count from public.employee_assignments
    where organization_id = o.id and is_active;
  if current_count >= o.employee_limit then
    raise exception 'Достигнут лимит сотрудников. Перейдите на другой тариф.';
  end if;
  if clean_name !~ '^[[:alpha:]][[:alpha:]''’ʼ-]{1,}([[:space:]]+[[:alpha:]][[:alpha:]''’ʼ-]{1,})+$' then
    raise exception 'Укажите настоящее имя и фамилию сотрудника';
  end if;
  if char_length(clean_position) not between 2 and 100 then raise exception 'Укажите должность сотрудника'; end if;
  if clean_phone !~ '^992[0-9]{9}$' then raise exception 'Телефон должен содержать 12 цифр и начинаться с 992'; end if;
  if clean_whatsapp !~ '^992[0-9]{9}$' then raise exception 'WhatsApp должен содержать 12 цифр и начинаться с 992'; end if;
  if trim(coalesce(employee_second_phone, '')) <> '' and regexp_replace(employee_second_phone, '\D', '', 'g') !~ '^992[0-9]{9}$' then
    raise exception 'Второй телефон должен содержать 12 цифр и начинаться с 992';
  end if;
  if trim(coalesce(employee_email, '')) <> '' and lower(trim(employee_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Укажите корректный email';
  end if;
  if target_department_id is not null and not exists (
    select 1 from public.departments where id = target_department_id and organization_id = o.id
  ) then raise exception 'Подразделение принадлежит другой организации'; end if;

  insert into public.employee_assignments(
    organization_id, department_id, profile_id, position, is_public, slug, full_name,
    description, phone, second_phone, whatsapp, telegram, instagram, facebook,
    email, website, address, photo_path, company_logo_path, language, theme, template,
    is_active, updated_at
  ) values (
    o.id, target_department_id, null, clean_position, true,
    'employee-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16), clean_name,
    trim(coalesce(employee_description, '')), clean_phone,
    regexp_replace(coalesce(employee_second_phone, ''), '\D', '', 'g'), clean_whatsapp,
    trim(coalesce(employee_telegram, '')), trim(coalesce(employee_instagram, '')),
    trim(coalesce(employee_facebook, '')), lower(trim(coalesce(employee_email, ''))),
    trim(coalesce(employee_website, '')), trim(coalesce(employee_address, '')),
    trim(coalesce(employee_photo, '')), trim(coalesce(employee_company_logo, '')),
    case when employee_language in ('ru','tj','en') then employee_language else 'ru' end,
    employee_theme, employee_template, true, now()
  ) returning * into result;
  return to_jsonb(result);
end; $$;

create or replace function public.update_organization_employee_card(
  target_assignment_id uuid,
  employee_name text,
  employee_position text,
  employee_phone text,
  employee_whatsapp text,
  target_department_id uuid default null,
  employee_second_phone text default '', employee_email text default '',
  employee_website text default '', employee_address text default '',
  employee_telegram text default '', employee_instagram text default '',
  employee_facebook text default '', employee_description text default '',
  employee_photo text default '', employee_company_logo text default '',
  employee_language text default 'ru', employee_theme text default 'teal',
  employee_template text default 'executive', employee_is_public boolean default true
) returns void language plpgsql security definer set search_path = public as $$
declare a public.employee_assignments%rowtype; o public.organizations%rowtype;
  clean_name text := trim(regexp_replace(coalesce(employee_name, ''), '\s+', ' ', 'g'));
  clean_phone text := regexp_replace(coalesce(employee_phone, ''), '\D', '', 'g');
  clean_whatsapp text := regexp_replace(coalesce(employee_whatsapp, ''), '\D', '', 'g');
begin
  select * into a from public.employee_assignments where id = target_assignment_id;
  if a.id is null then raise exception 'Сотрудник не найден'; end if;
  o := public.assert_organization_manager(a.organization_id);
  if clean_name !~ '^[[:alpha:]][[:alpha:]''’ʼ-]{1,}([[:space:]]+[[:alpha:]][[:alpha:]''’ʼ-]{1,})+$' then raise exception 'Укажите настоящее имя и фамилию'; end if;
  if char_length(trim(employee_position)) not between 2 and 100 then raise exception 'Укажите должность'; end if;
  if clean_phone !~ '^992[0-9]{9}$' or clean_whatsapp !~ '^992[0-9]{9}$' then raise exception 'Проверьте номер телефона и WhatsApp'; end if;
  if trim(coalesce(employee_second_phone, '')) <> '' and regexp_replace(employee_second_phone,'\D','','g') !~ '^992[0-9]{9}$' then raise exception 'Проверьте второй телефон'; end if;
  if trim(coalesce(employee_email,'')) <> '' and lower(trim(employee_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Укажите корректный email'; end if;
  if target_department_id is not null and not exists(select 1 from public.departments where id=target_department_id and organization_id=a.organization_id) then raise exception 'Неверное подразделение'; end if;
  update public.employee_assignments set department_id=target_department_id, full_name=clean_name,
    position=trim(employee_position), phone=clean_phone, whatsapp=clean_whatsapp,
    second_phone=regexp_replace(coalesce(employee_second_phone,''),'\D','','g'),
    email=lower(trim(coalesce(employee_email,''))), website=trim(coalesce(employee_website,'')),
    address=trim(coalesce(employee_address,'')), telegram=trim(coalesce(employee_telegram,'')),
    instagram=trim(coalesce(employee_instagram,'')), facebook=trim(coalesce(employee_facebook,'')),
    description=trim(coalesce(employee_description,'')), photo_path=trim(coalesce(employee_photo,'')),
    company_logo_path=trim(coalesce(employee_company_logo,'')), language=case when employee_language in ('ru','tj','en') then employee_language else 'ru' end,
    theme=employee_theme, template=employee_template, is_public=employee_is_public,
    is_active=true, updated_at=now()
  where id=target_assignment_id;
end; $$;

create or replace function public.remove_organization_employee(target_assignment_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare a public.employee_assignments%rowtype;
begin
  select * into a from public.employee_assignments where id=target_assignment_id;
  if a.id is null then return; end if;
  perform public.assert_organization_manager(a.organization_id);
  delete from public.employee_assignments where id=a.id;
  if a.profile_id is not null then
    delete from public.organization_members where organization_id=a.organization_id and profile_id=a.profile_id and role='employee';
  end if;
end; $$;

create or replace function public.get_organization_workspace(target_organization_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'organization',to_jsonb(o),
 'departments',coalesce((select jsonb_agg(to_jsonb(d) order by d.sort_order,d.name) from departments d where d.organization_id=o.id),'[]'::jsonb),
 'employees',coalesce((select jsonb_agg(jsonb_build_object(
   'id',a.id,'profileId',a.profile_id,'name',a.full_name,'position',a.position,
   'departmentId',a.department_id,'department',coalesce(d.name,'—'),'isPublic',a.is_public,
   'cardSlug',a.slug,'cardStatus',case when a.is_active then 'approved' else 'inactive' end,
   'phone',a.phone,'secondPhone',a.second_phone,'whatsapp',a.whatsapp,'email',a.email,
   'website',a.website,'address',a.address,'telegram',a.telegram,'instagram',a.instagram,
   'facebook',a.facebook,'description',a.description,'photo',a.photo_path,
   'companyLogo',a.company_logo_path,'language',a.language,'theme',a.theme,'template',a.template
 ) order by a.full_name) from employee_assignments a left join departments d on d.id=a.department_id where a.organization_id=o.id),'[]'::jsonb),
 'invitations','[]'::jsonb
) from organizations o where o.id=target_organization_id and public.is_organization_admin(o.id);
$$;

create or replace function public.get_public_organization(target_slug text)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'organization',jsonb_build_object('id',o.id,'slug',o.slug,'name',o.display_name,'description',o.description,'logo',o.logo_path,'phone',o.phone,'email',o.email,'address',o.address),
 'departments',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'parentId',d.parent_id) order by d.sort_order,d.name) from departments d where d.organization_id=o.id),'[]'::jsonb),
 'employees',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'name',a.full_name,'position',a.position,'departmentId',a.department_id,'slug',a.slug,'photo',a.photo_path) order by a.full_name) from employee_assignments a where a.organization_id=o.id and a.is_public and a.is_active),'[]'::jsonb)
) from organizations o where o.slug=lower(trim(target_slug)) and o.review_status='approved' and o.active_until>now();
$$;

create or replace function public.get_public_organization_employee(target_slug text)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'id',a.id,'slug',a.slug,'photo',a.photo_path,
 'companyLogo',coalesce(nullif(a.company_logo_path,''),o.logo_path,''),
 'fullName',a.full_name,'position',a.position,'organization',o.display_name,
 'description',a.description,'phone',a.phone,'secondPhone',a.second_phone,
 'whatsapp',a.whatsapp,'telegram',a.telegram,'instagram',a.instagram,'facebook',a.facebook,
 'email',a.email,'website',a.website,'address',a.address,'language',a.language,
 'theme',a.theme,'template',a.template,'organizationManaged',true
)
from employee_assignments a join organizations o on o.id=a.organization_id
where lower(a.slug)=lower(trim(target_slug)) and a.is_public and a.is_active
 and o.review_status='approved' and o.active_until>now();
$$;

revoke all on function public.create_organization_employee_card(uuid,text,text,text,text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.create_organization_employee_card(uuid,text,text,text,text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;
revoke all on function public.update_organization_employee_card(uuid,text,text,text,text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean) from public;
grant execute on function public.update_organization_employee_card(uuid,text,text,text,text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.remove_organization_employee(uuid) to authenticated;
grant execute on function public.get_organization_workspace(uuid) to authenticated;
grant execute on function public.get_public_organization(text) to anon,authenticated;
grant execute on function public.get_public_organization_employee(text) to anon,authenticated;
