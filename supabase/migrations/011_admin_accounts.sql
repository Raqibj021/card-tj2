-- VIZORA.TJ: administrator account and organization control center.
-- Run after 010_email_delivery_completion.sql.

alter table public.profiles
  add column if not exists account_status text not null default 'active'
    check (account_status in ('active','blocked')),
  add column if not exists status_reason text not null default '',
  add column if not exists status_changed_at timestamptz,
  add column if not exists status_changed_by uuid references public.profiles(id) on delete set null;

create index if not exists profiles_account_status_created_idx
  on public.profiles(account_status, created_at desc);

create or replace function public.get_admin_accounts_workspace(search_text text default '')
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare query text := lower(trim(coalesce(search_text,'')));
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  select jsonb_build_object(
    'accounts', coalesce((select jsonb_agg(item) from (
      select jsonb_build_object(
        'id',p.id,'fullName',p.full_name,'email',coalesce(p.email,''),
        'phone',coalesce(p.phone,''),'role',p.role,'status',p.account_status,
        'statusReason',p.status_reason,'identityVerified',p.identity_verified_at is not null,
        'cards',(select count(*) from public.cards c where c.owner_id=p.id),
        'organizations',(select count(*) from public.organization_members m where m.profile_id=p.id),
        'duplicateSignals',
          (case when nullif(trim(coalesce(p.phone,'')),'') is not null and exists (
            select 1 from public.profiles p2 where p2.id<>p.id and p2.phone=p.phone
          ) then 1 else 0 end) +
          (case when nullif(trim(coalesce(p.email,'')),'') is not null and exists (
            select 1 from public.profiles p2 where p2.id<>p.id and lower(p2.email)=lower(p.email)
          ) then 1 else 0 end),
        'createdAt',p.created_at
      ) item
      from public.profiles p
      where p.role='user' and (
        query='' or lower(p.full_name) like '%'||query||'%' or
        lower(coalesce(p.email,'')) like '%'||query||'%' or
        lower(coalesce(p.phone,'')) like '%'||query||'%'
      )
      order by p.created_at desc limit 200
    ) a), '[]'::jsonb),
    'organizations', coalesce((select jsonb_agg(item) from (
      select jsonb_build_object(
        'id',o.id,'name',o.display_name,'legalName',o.legal_name,'slug',o.slug,
        'status',o.review_status,'ownerName',p.full_name,'ownerEmail',coalesce(p.email,''),
        'employees',(select count(*) from public.employee_assignments e where e.organization_id=o.id),
        'departments',(select count(*) from public.departments d where d.organization_id=o.id),
        'cards',(select count(*) from public.employee_assignments e join public.cards c on c.owner_id=e.profile_id where e.organization_id=o.id),
        'activeUntil',o.active_until,'createdAt',o.created_at
      ) item
      from public.organizations o join public.profiles p on p.id=o.owner_id
      where query='' or lower(o.display_name) like '%'||query||'%' or
        lower(o.legal_name) like '%'||query||'%' or lower(coalesce(p.email,'')) like '%'||query||'%'
      order by o.created_at desc limit 200
    ) o), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.get_admin_organization_detail(target_organization_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  select jsonb_build_object(
    'id',o.id,'name',o.display_name,'legalName',o.legal_name,'slug',o.slug,
    'status',o.review_status,'ownerName',owner.full_name,'ownerEmail',coalesce(owner.email,''),
    'employees',(select count(*) from public.employee_assignments e where e.organization_id=o.id),
    'departments',(select count(*) from public.departments d where d.organization_id=o.id),
    'cards',(select count(*) from public.employee_assignments e join public.cards c on c.owner_id=e.profile_id where e.organization_id=o.id),
    'activeUntil',o.active_until,'createdAt',o.created_at,
    'structure',coalesce((select jsonb_agg(jsonb_build_object(
      'id',d.id,'name',d.name,'parentId',d.parent_id,
      'employees',(select count(*) from public.employee_assignments e where e.department_id=d.id)
    ) order by d.sort_order,d.name) from public.departments d where d.organization_id=o.id),'[]'::jsonb),
    'members',coalesce((select jsonb_agg(jsonb_build_object(
      'id',e.id,'name',p.full_name,'email',coalesce(p.email,''),'position',e.position,
      'department',coalesce(d.name,''),'cardSlug',coalesce(c.slug,''),
      'cardStatus',coalesce(c.review_status::text,''),'isPublic',e.is_public
    ) order by p.full_name) from public.employee_assignments e
      join public.profiles p on p.id=e.profile_id
      left join public.departments d on d.id=e.department_id
      left join public.cards c on c.owner_id=e.profile_id
      where e.organization_id=o.id),'[]'::jsonb)
  ) into result
  from public.organizations o join public.profiles owner on owner.id=o.owner_id
  where o.id=target_organization_id;
  if result is null then raise exception 'Organization not found'; end if;
  return result;
end;
$$;

create or replace function public.admin_set_account_status(
  target_profile_id uuid, target_status text, reason text default ''
)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare previous_status text;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if target_status not in ('active','blocked') then raise exception 'Invalid account status'; end if;
  if target_profile_id=auth.uid() then raise exception 'Administrator cannot block the active admin account'; end if;
  if exists(select 1 from public.profiles where id=target_profile_id and role='admin') then
    raise exception 'Administrator accounts cannot be changed here';
  end if;
  select account_status into previous_status from public.profiles where id=target_profile_id for update;
  if previous_status is null then raise exception 'Account not found'; end if;

  update public.profiles set account_status=target_status,status_reason=trim(reason),
    status_changed_at=now(),status_changed_by=auth.uid(),updated_at=now()
  where id=target_profile_id;
  update auth.users set banned_until=case when target_status='blocked' then 'infinity'::timestamptz else null end
  where id=target_profile_id;

  if target_status='blocked' then
    update public.cards set visibility='private',review_status='suspended',updated_at=now()
    where owner_id=target_profile_id;
    update public.organizations set review_status='suspended',updated_at=now()
    where owner_id=target_profile_id;
  end if;

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'account_status_changed',jsonb_build_object(
    'profileId',target_profile_id,'from',previous_status,'to',target_status,'reason',trim(reason)
  ));
end;
$$;

grant execute on function public.get_admin_accounts_workspace(text) to authenticated;
grant execute on function public.get_admin_organization_detail(uuid) to authenticated;
grant execute on function public.admin_set_account_status(uuid,text,text) to authenticated;
