-- Organizations, invitations and notification queue.
-- Run after 003_production_foundation.sql.

alter table public.organizations
  add column if not exists brand_theme text not null default 'navy',
  add column if not exists public_views bigint not null default 0;

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text not null default '',
  position text not null,
  department_id uuid references public.departments(id) on delete set null,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_by uuid not null references public.profiles(id),
  accepted_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (organization_id, email)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','sending','sent','failed','cancelled')),
  attempts integer not null default 0,
  last_error text,
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.organization_invitations enable row level security;
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;

create policy "organization admins read invitations" on public.organization_invitations for select using (
  lower(email) = lower(coalesce(auth.jwt()->>'email',''))
  or exists (
    select 1 from public.organization_members m
    where m.organization_id = organization_id and m.profile_id = auth.uid()
      and m.role in ('owner','admin','editor')
  )
);
create policy "notifications own read" on public.notifications for select using (user_id = auth.uid());
create policy "notifications own update" on public.notifications for update using (user_id = auth.uid());
create policy "staff manage outbox" on public.email_outbox for all using (public.is_staff());

create or replace function public.is_organization_admin(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = target_organization_id and profile_id = auth.uid()
      and role in ('owner','admin','editor')
  );
$$;

create or replace function public.invite_organization_employee(
  target_organization_id uuid,
  employee_email text,
  employee_name text,
  employee_phone text,
  employee_position text,
  target_department_id uuid default null
)
returns text
language plpgsql security definer set search_path = public
as $$
declare plain_code text;
declare target_org public.organizations%rowtype;
declare current_count integer;
begin
  if not public.is_organization_admin(target_organization_id) then
    raise exception 'Organization administrator access required';
  end if;
  select * into target_org from public.organizations where id = target_organization_id;
  if target_org.active_until is null or target_org.active_until < now() then
    raise exception 'Organization plan is not active';
  end if;
  select count(*) into current_count from public.employee_assignments
    where organization_id = target_organization_id;
  if current_count >= target_org.employee_limit then raise exception 'Employee plan limit reached'; end if;
  plain_code := 'ORG-' || upper(substr(encode(gen_random_bytes(8),'hex'),1,8));
  insert into public.organization_invitations (
    organization_id, email, full_name, phone, position, department_id,
    token_hash, created_by, status, expires_at
  ) values (
    target_organization_id, lower(trim(employee_email)), trim(employee_name),
    trim(employee_phone), trim(employee_position), target_department_id,
    encode(digest(upper(plain_code),'sha256'),'hex'), auth.uid(), 'pending',
    now() + interval '7 days'
  )
  on conflict (organization_id, email) do update set
    full_name = excluded.full_name, phone = excluded.phone,
    position = excluded.position, department_id = excluded.department_id,
    token_hash = excluded.token_hash, created_by = excluded.created_by,
    status = 'pending', expires_at = excluded.expires_at;
  insert into public.email_outbox (recipient, template_key, payload)
  values (lower(trim(employee_email)), 'organization_invitation',
    jsonb_build_object('organization', target_org.display_name, 'code', plain_code, 'expiresHours', 168));
  return plain_code;
end;
$$;
grant execute on function public.invite_organization_employee(uuid,text,text,text,text,uuid) to authenticated;

create or replace function public.accept_organization_invitation(plain_code text)
returns uuid
language plpgsql security definer set search_path = public, auth
as $$
declare invitation public.organization_invitations%rowtype;
declare target_org public.organizations%rowtype;
declare new_slug text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select i.* into invitation from public.organization_invitations i
  join auth.users u on u.id = auth.uid()
  where lower(i.email) = lower(u.email)
    and i.token_hash = encode(digest(upper(trim(plain_code)),'sha256'),'hex')
    and i.status = 'pending' and i.expires_at > now()
  limit 1;
  if invitation.id is null then raise exception 'Invalid or expired invitation'; end if;
  select * into target_org from public.organizations where id = invitation.organization_id;
  insert into public.organization_members (organization_id, profile_id, role)
  values (invitation.organization_id, auth.uid(), 'employee') on conflict do nothing;
  insert into public.employee_assignments (organization_id, department_id, profile_id, position)
  values (invitation.organization_id, invitation.department_id, auth.uid(), invitation.position)
  on conflict (organization_id, profile_id) do update set
    department_id = excluded.department_id, position = excluded.position;
  new_slug := regexp_replace(lower(coalesce(invitation.full_name,'employee')), '[^a-z0-9]+', '-', 'g')
    || '-' || substr(auth.uid()::text,1,6);
  insert into public.cards (
    owner_id, slug, full_name, position, organization_name, contacts,
    theme, template, visibility, review_status
  ) values (
    auth.uid(), new_slug, invitation.full_name, invitation.position, target_org.display_name,
    jsonb_build_object('phone', invitation.phone, 'email', invitation.email),
    target_org.brand_theme, 'executive', 'organization', 'pending'
  ) on conflict (owner_id) do update set
    organization_name = excluded.organization_name, position = excluded.position,
    contacts = public.cards.contacts || excluded.contacts, updated_at = now();
  update public.organization_invitations set
    status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = invitation.id;
  insert into public.notifications (user_id, kind, title, body, action_url)
  values (auth.uid(), 'organization_joined', 'Вы присоединились к организации',
    target_org.display_name, '/dashboard');
  return invitation.organization_id;
end;
$$;
grant execute on function public.accept_organization_invitation(text) to authenticated;

create or replace function public.get_organization_workspace(target_organization_id uuid)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'organization', to_jsonb(o),
    'departments', coalesce((select jsonb_agg(to_jsonb(d) order by d.sort_order, d.name)
      from public.departments d where d.organization_id = o.id), '[]'::jsonb),
    'employees', coalesce((select jsonb_agg(jsonb_build_object(
      'id', a.id, 'profileId', a.profile_id, 'name', p.full_name,
      'email', p.email, 'position', a.position, 'departmentId', a.department_id,
      'department', d.name, 'isPublic', a.is_public, 'cardSlug', c.slug,
      'cardStatus', c.review_status
    )) from public.employee_assignments a
      join public.profiles p on p.id = a.profile_id
      left join public.departments d on d.id = a.department_id
      left join public.cards c on c.owner_id = a.profile_id
      where a.organization_id = o.id), '[]'::jsonb),
    'invitations', coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'name', i.full_name, 'email', i.email, 'phone', i.phone,
      'position', i.position, 'departmentId', i.department_id,
      'status', i.status, 'expiresAt', i.expires_at
    )) from public.organization_invitations i
      where i.organization_id = o.id and i.status = 'pending'), '[]'::jsonb)
  )
  from public.organizations o
  where o.id = target_organization_id and public.is_organization_admin(o.id);
$$;
grant execute on function public.get_organization_workspace(uuid) to authenticated;

create or replace function public.get_public_organization(target_slug text)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'organization', jsonb_build_object('id',o.id,'slug',o.slug,'name',o.display_name,
      'description',o.description,'logo',o.logo_path,'phone',o.phone,'email',o.email,'address',o.address),
    'departments', coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'parentId',d.parent_id))
      from public.departments d where d.organization_id=o.id), '[]'::jsonb),
    'employees', coalesce((select jsonb_agg(jsonb_build_object(
      'name',p.full_name,'position',a.position,'departmentId',a.department_id,
      'slug',c.slug,'photo',c.photo_path
    )) from public.employee_assignments a
      join public.profiles p on p.id=a.profile_id
      join public.cards c on c.owner_id=a.profile_id and c.review_status='approved'
      where a.organization_id=o.id and a.is_public), '[]'::jsonb)
  ) from public.organizations o
  where o.slug=lower(trim(target_slug)) and o.review_status='approved'
    and o.active_until > now();
$$;
grant execute on function public.get_public_organization(text) to anon, authenticated;
