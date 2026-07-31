-- VIZORA.TJ: remove the organizations <-> organization_members RLS cycle.
-- Run after 025_organization_workflow.sql.

-- Policy predicates must not query each other through RLS. These small
-- SECURITY DEFINER helpers read the authoritative tables without re-entering
-- their policies, while still binding every check to the current auth user.
create or replace function public.is_organization_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.organization_members m
    where m.organization_id = target_organization_id
      and m.profile_id = auth.uid()
  );
$$;

create or replace function public.is_organization_owner(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.organizations o
    where o.id = target_organization_id
      and o.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_organization_owner(uuid) from public;
grant execute on function public.is_organization_member(uuid) to anon, authenticated;
grant execute on function public.is_organization_owner(uuid) to authenticated;

drop policy if exists "organizations public or member" on public.organizations;
create policy "organizations public or member"
on public.organizations
for select
using (
  review_status = 'approved'
  or owner_id = auth.uid()
  or public.is_organization_member(id)
  or public.is_platform_admin()
);

drop policy if exists "members see memberships" on public.organization_members;
create policy "members see memberships"
on public.organization_members
for select
using (
  profile_id = auth.uid()
  or public.is_organization_owner(organization_id)
  or public.is_platform_admin()
);

drop policy if exists "owners manage memberships" on public.organization_members;
create policy "owners manage memberships"
on public.organization_members
for all
using (
  public.is_organization_owner(organization_id)
  or public.is_platform_admin()
)
with check (
  public.is_organization_owner(organization_id)
  or public.is_platform_admin()
);

