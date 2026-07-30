-- VIZORA.TJ: authoritative organization structure and staff lifecycle.
-- Run after 021_commerce_activation_integrity.sql.

create or replace function public.assert_organization_manager(target_organization_id uuid)
returns public.organizations language plpgsql security definer set search_path=public as $$
declare target public.organizations%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select o.* into target from public.organizations o where o.id=target_organization_id
    and exists(select 1 from public.organization_members m where m.organization_id=o.id
      and m.profile_id=auth.uid() and m.role in ('owner','admin','editor'));
  if target.id is null then raise exception 'Organization manager access required'; end if;
  return target;
end; $$;
revoke all on function public.assert_organization_manager(uuid) from public;

create or replace function public.create_organization_department(target_organization_id uuid,department_name text,target_parent_id uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare target public.organizations%rowtype; new_id uuid; clean_name text:=trim(coalesce(department_name,'')); clean_slug text;
begin
  target:=public.assert_organization_manager(target_organization_id);
  if target.active_until is null or target.active_until<=now() then raise exception 'Organization tariff is not active'; end if;
  if char_length(clean_name) not between 2 and 100 then raise exception 'Enter a department name'; end if;
  if target_parent_id is not null and not exists(select 1 from public.departments where id=target_parent_id and organization_id=target_organization_id)
    then raise exception 'Parent department belongs to another organization'; end if;
  clean_slug:=trim(both '-' from regexp_replace(lower(clean_name),'[^a-zа-яё0-9]+','-','g'));
  if clean_slug='' then clean_slug:='department'; end if;
  clean_slug:=clean_slug||'-'||substr(replace(gen_random_uuid()::text,'-',''),1,6);
  insert into public.departments(organization_id,parent_id,name,slug,sort_order)
  values(target_organization_id,target_parent_id,clean_name,clean_slug,coalesce((select max(sort_order)+1 from public.departments
    where organization_id=target_organization_id and parent_id is not distinct from target_parent_id),0)) returning id into new_id;
  return new_id;
end; $$;

create or replace function public.update_organization_department(target_department_id uuid,department_name text,target_parent_id uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare current_department public.departments%rowtype; clean_name text:=trim(coalesce(department_name,''));
begin
  select * into current_department from public.departments where id=target_department_id;
  if current_department.id is null then raise exception 'Department not found'; end if;
  perform public.assert_organization_manager(current_department.organization_id);
  if char_length(clean_name) not between 2 and 100 then raise exception 'Enter a department name'; end if;
  if target_parent_id=target_department_id then raise exception 'A department cannot contain itself'; end if;
  if target_parent_id is not null and not exists(select 1 from public.departments where id=target_parent_id and organization_id=current_department.organization_id)
    then raise exception 'Parent department belongs to another organization'; end if;
  if target_parent_id is not null and exists(with recursive descendants as (
    select id from public.departments where parent_id=target_department_id union all
    select d.id from public.departments d join descendants x on d.parent_id=x.id)
    select 1 from descendants where id=target_parent_id) then raise exception 'A department cannot be moved inside its descendant'; end if;
  update public.departments set name=clean_name,parent_id=target_parent_id where id=target_department_id;
end; $$;

create or replace function public.delete_organization_department(target_department_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare current_department public.departments%rowtype;
begin
  select * into current_department from public.departments where id=target_department_id;
  if current_department.id is null then raise exception 'Department not found'; end if;
  perform public.assert_organization_manager(current_department.organization_id);
  if exists(select 1 from public.departments where parent_id=target_department_id) then raise exception 'Move or delete child departments first'; end if;
  if exists(select 1 from public.employee_assignments where department_id=target_department_id) then raise exception 'Move employees out of this department first'; end if;
  delete from public.departments where id=target_department_id;
end; $$;

create or replace function public.invite_organization_employee(target_organization_id uuid,employee_email text,employee_name text,
  employee_phone text,employee_position text,target_department_id uuid default null)
returns text language plpgsql security definer set search_path=public,auth,extensions as $$
declare plain_code text; target_org public.organizations%rowtype; occupied_count integer;
  clean_email text:=lower(trim(coalesce(employee_email,''))); clean_name text:=trim(coalesce(employee_name,''));
  clean_phone text:=regexp_replace(coalesce(employee_phone,''),'\D','','g'); clean_position text:=trim(coalesce(employee_position,''));
begin
  target_org:=public.assert_organization_manager(target_organization_id);
  perform 1 from public.organizations where id=target_organization_id for update;
  if target_org.active_until is null or target_org.active_until<=now() then raise exception 'Organization tariff is not active'; end if;
  if clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Enter a valid employee email'; end if;
  if char_length(clean_name) not between 2 and 100 then raise exception 'Enter the employee full name'; end if;
  if char_length(clean_phone) not between 9 and 15 then raise exception 'Enter a valid employee phone'; end if;
  if char_length(clean_position) not between 2 and 100 then raise exception 'Enter the employee position'; end if;
  if target_department_id is not null and not exists(select 1 from public.departments where id=target_department_id and organization_id=target_organization_id)
    then raise exception 'Department belongs to another organization'; end if;
  if exists(select 1 from public.employee_assignments a join public.profiles p on p.id=a.profile_id
    where a.organization_id=target_organization_id and lower(p.email)=clean_email) then raise exception 'This employee already belongs to the organization'; end if;
  select (select count(*) from public.employee_assignments where organization_id=target_organization_id)+
    (select count(*) from public.organization_invitations where organization_id=target_organization_id and status='pending' and expires_at>now()) into occupied_count;
  if occupied_count>=target_org.employee_limit then raise exception 'Employee tariff limit reached'; end if;
  plain_code:='ORG-'||upper(substr(encode(extensions.gen_random_bytes(8),'hex'),1,8));
  insert into public.organization_invitations(organization_id,email,full_name,phone,position,department_id,token_hash,created_by,status,expires_at)
  values(target_organization_id,clean_email,clean_name,clean_phone,clean_position,target_department_id,
    encode(digest(upper(plain_code),'sha256'),'hex'),auth.uid(),'pending',now()+interval '7 days')
  on conflict(organization_id,email) do update set full_name=excluded.full_name,phone=excluded.phone,position=excluded.position,
    department_id=excluded.department_id,token_hash=excluded.token_hash,created_by=excluded.created_by,status='pending',expires_at=excluded.expires_at;
  insert into public.email_outbox(recipient,template_key,payload) values(clean_email,'organization_invitation',
    jsonb_build_object('organization',target_org.display_name,'code',plain_code,'expiresHours',168));
  return plain_code;
end; $$;

create or replace function public.accept_organization_invitation(plain_code text)
returns uuid language plpgsql security definer set search_path=public,auth as $$
declare invitation public.organization_invitations%rowtype; target_org public.organizations%rowtype; current_count integer; new_slug text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select i.* into invitation from public.organization_invitations i join auth.users u on u.id=auth.uid()
  where lower(i.email)=lower(u.email) and i.token_hash=encode(digest(upper(trim(plain_code)),'sha256'),'hex')
    and i.status='pending' and i.expires_at>now() limit 1 for update of i;
  if invitation.id is null then raise exception 'Invalid or expired invitation'; end if;
  select * into target_org from public.organizations where id=invitation.organization_id for update;
  if target_org.active_until is null or target_org.active_until<=now() then raise exception 'Organization tariff is not active'; end if;
  select count(*) into current_count from public.employee_assignments where organization_id=invitation.organization_id;
  if current_count>=target_org.employee_limit then raise exception 'Employee tariff limit reached'; end if;
  if invitation.department_id is not null and not exists(select 1 from public.departments where id=invitation.department_id and organization_id=invitation.organization_id)
    then raise exception 'Invitation department is no longer available'; end if;
  insert into public.organization_members(organization_id,profile_id,role) values(invitation.organization_id,auth.uid(),'employee')
    on conflict(organization_id,profile_id) do update set role='employee';
  insert into public.employee_assignments(organization_id,department_id,profile_id,position,is_public)
    values(invitation.organization_id,invitation.department_id,auth.uid(),invitation.position,true)
    on conflict(organization_id,profile_id) do update set department_id=excluded.department_id,position=excluded.position;
  new_slug:=regexp_replace(lower(coalesce(invitation.full_name,'employee')),'[^a-z0-9]+','-','g')||'-'||substr(auth.uid()::text,1,6);
  insert into public.cards(owner_id,slug,full_name,position,organization_name,contacts,theme,template,visibility,review_status)
  values(auth.uid(),new_slug,invitation.full_name,invitation.position,target_org.display_name,
    jsonb_build_object('phone',invitation.phone,'email',invitation.email),target_org.brand_theme,'executive','organization','pending')
  on conflict(owner_id) do update set full_name=excluded.full_name,organization_name=excluded.organization_name,position=excluded.position,
    contacts=public.cards.contacts||excluded.contacts,visibility='organization',review_status='pending',updated_at=now();
  update public.organization_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now() where id=invitation.id;
  insert into public.notifications(user_id,kind,title,body,action_url) values(auth.uid(),'organization_joined',
    'Вы присоединились к организации',target_org.display_name,'/dashboard');
  return invitation.organization_id;
end; $$;

create or replace function public.update_organization_employee(target_assignment_id uuid,employee_position text,
  target_department_id uuid default null,employee_is_public boolean default true)
returns void language plpgsql security definer set search_path=public as $$
declare assignment public.employee_assignments%rowtype; clean_position text:=trim(coalesce(employee_position,''));
begin
  select * into assignment from public.employee_assignments where id=target_assignment_id;
  if assignment.id is null then raise exception 'Employee not found'; end if;
  perform public.assert_organization_manager(assignment.organization_id);
  if char_length(clean_position) not between 2 and 100 then raise exception 'Enter the employee position'; end if;
  if target_department_id is not null and not exists(select 1 from public.departments where id=target_department_id and organization_id=assignment.organization_id)
    then raise exception 'Department belongs to another organization'; end if;
  update public.employee_assignments set position=clean_position,department_id=target_department_id,is_public=employee_is_public where id=target_assignment_id;
  update public.cards set position=clean_position,review_status='pending',visibility='organization',updated_at=now() where owner_id=assignment.profile_id;
end; $$;

create or replace function public.remove_organization_employee(target_assignment_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare assignment public.employee_assignments%rowtype;
begin
  select * into assignment from public.employee_assignments where id=target_assignment_id;
  if assignment.id is null then raise exception 'Employee not found'; end if;
  perform public.assert_organization_manager(assignment.organization_id);
  delete from public.employee_assignments where id=target_assignment_id;
  delete from public.organization_members where organization_id=assignment.organization_id and profile_id=assignment.profile_id and role='employee';
  update public.cards set visibility='private',review_status='changes_requested',updated_at=now()
    where owner_id=assignment.profile_id and visibility in ('organization','public_organization');
end; $$;

create or replace function public.revoke_organization_invitation(target_invitation_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare invitation public.organization_invitations%rowtype;
begin
  select * into invitation from public.organization_invitations where id=target_invitation_id;
  if invitation.id is null then raise exception 'Invitation not found'; end if;
  perform public.assert_organization_manager(invitation.organization_id);
  update public.organization_invitations set status='revoked' where id=target_invitation_id;
end; $$;

create or replace function public.get_organization_workspace(target_organization_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object('organization',to_jsonb(o),
  'departments',coalesce((select jsonb_agg(to_jsonb(d) order by d.sort_order,d.name) from public.departments d where d.organization_id=o.id),'[]'::jsonb),
  'employees',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'profileId',a.profile_id,'name',p.full_name,'email',p.email,
    'position',a.position,'departmentId',a.department_id,'department',d.name,'isPublic',a.is_public,'cardSlug',c.slug,'cardStatus',c.review_status) order by p.full_name)
    from public.employee_assignments a join public.profiles p on p.id=a.profile_id left join public.departments d on d.id=a.department_id
    left join public.cards c on c.owner_id=a.profile_id where a.organization_id=o.id),'[]'::jsonb),
  'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'name',i.full_name,'email',i.email,'phone',i.phone,
    'position',i.position,'departmentId',i.department_id,'status',i.status,'expiresAt',i.expires_at) order by i.created_at desc)
    from public.organization_invitations i where i.organization_id=o.id and i.status='pending' and i.expires_at>now()),'[]'::jsonb))
from public.organizations o where o.id=target_organization_id and public.is_organization_admin(o.id); $$;

create or replace function public.get_public_organization(target_slug text)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object('organization',jsonb_build_object('id',o.id,'slug',o.slug,'name',o.display_name,'description',o.description,
  'logo',o.logo_path,'phone',o.phone,'email',o.email,'address',o.address),
  'departments',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'parentId',d.parent_id) order by d.sort_order,d.name)
    from public.departments d where d.organization_id=o.id),'[]'::jsonb),
  'employees',coalesce((select jsonb_agg(jsonb_build_object('name',p.full_name,'position',a.position,'departmentId',a.department_id,
    'slug',c.slug,'photo',c.photo_path) order by p.full_name) from public.employee_assignments a join public.profiles p on p.id=a.profile_id
    join public.cards c on c.owner_id=a.profile_id and c.review_status='approved' and c.visibility in ('organization','public_organization')
    where a.organization_id=o.id and a.is_public),'[]'::jsonb))
from public.organizations o where o.slug=lower(trim(target_slug)) and o.review_status='approved' and o.active_until>now(); $$;

drop policy if exists "departments public read" on public.departments;
drop policy if exists "assignments public read" on public.employee_assignments;
drop policy if exists "organization members read departments" on public.departments;
drop policy if exists "organization staff read assignments" on public.employee_assignments;
create policy "organization members read departments" on public.departments for select using(
  exists(select 1 from public.organization_members m where m.organization_id=organization_id and m.profile_id=auth.uid()));
create policy "organization staff read assignments" on public.employee_assignments for select using(profile_id=auth.uid() or exists(
  select 1 from public.organization_members m where m.organization_id=organization_id and m.profile_id=auth.uid() and m.role in ('owner','admin','editor')));

revoke insert,update,delete on public.departments from authenticated;
revoke insert,update,delete on public.employee_assignments from authenticated;
revoke insert,update,delete on public.organization_invitations from authenticated;
grant execute on function public.create_organization_department(uuid,text,uuid) to authenticated;
grant execute on function public.update_organization_department(uuid,text,uuid) to authenticated;
grant execute on function public.delete_organization_department(uuid) to authenticated;
grant execute on function public.invite_organization_employee(uuid,text,text,text,text,uuid) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
grant execute on function public.update_organization_employee(uuid,text,uuid,boolean) to authenticated;
grant execute on function public.remove_organization_employee(uuid) to authenticated;
grant execute on function public.revoke_organization_invitation(uuid) to authenticated;
grant execute on function public.get_organization_workspace(uuid) to authenticated;
grant execute on function public.get_public_organization(text) to anon,authenticated;
