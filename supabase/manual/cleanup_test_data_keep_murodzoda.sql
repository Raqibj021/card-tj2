-- ONE-TIME DESTRUCTIVE CLEANUP FOR THE PRE-LAUNCH DATABASE.
-- This version deliberately uses one atomic DO statement and no temporary
-- tables, so it works reliably in the Supabase SQL Editor.
--
-- Keeps:
--   1) the account of Муродзода Мухаммад (matched by name or mr_design@bk.ru)
--   2) the Vizora system administrator (vizora.platform.tj@gmail.com)
--   3) every account that already has profile role = admin (safety guard)
-- Deletes every organization and every other registered account.

do $cleanup$
declare
  keep_user_ids uuid[];
  delete_user_ids uuid[];
begin
  select coalesce(array_agg(u.id), array[]::uuid[])
  into keep_user_ids
  from auth.users u
  left join public.profiles p on p.id = u.id
  where lower(coalesce(u.email, '')) in (
      'mr_design@bk.ru',
      'vizora.platform.tj@gmail.com'
    )
    or p.role = 'admin'
    or (
      lower(coalesce(p.full_name, '')) like '%муродзода%'
      and lower(coalesce(p.full_name, '')) like '%мухаммад%'
    );

  -- Stop the whole statement before any deletion if the requested account
  -- cannot be identified. PostgreSQL rolls back every action in this block.
  if not exists (
    select 1
    from auth.users u
    left join public.profiles p on p.id = u.id
    where lower(coalesce(u.email, '')) = 'mr_design@bk.ru'
       or (
         lower(coalesce(p.full_name, '')) like '%муродзода%'
         and lower(coalesce(p.full_name, '')) like '%мухаммад%'
       )
  ) then
    raise exception 'ОСТАНОВЛЕНО: аккаунт Муродзода Мухаммад не найден. Ничего не удалено.';
  end if;

  select coalesce(array_agg(u.id), array[]::uuid[])
  into delete_user_ids
  from auth.users u
  where not (u.id = any(keep_user_ids));

  -- Remove organization commerce records before organizations because some
  -- foreign keys are intentionally restrictive.
  delete from public.contracts
  where organization_id is not null
     or user_id = any(delete_user_ids);

  delete from public.service_orders
  where organization_id is not null
     or user_id = any(delete_user_ids);

  delete from public.orders
  where organization_id is not null
     or plan_code in ('start', 'business', 'organization_pro')
     or user_id = any(delete_user_ids);

  delete from public.verification_requests
  where organization_id is not null
     or profile_id = any(delete_user_ids);

  -- Organization members, departments, invitations and employee assignments
  -- are removed by their ON DELETE CASCADE constraints.
  delete from public.organizations;

  delete from public.subscriptions
  where plan_code in ('start', 'business', 'organization_pro')
     or profile_id = any(delete_user_ids);

  delete from public.notifications
  where user_id = any(delete_user_ids)
     or kind like 'organization_%';

  delete from public.support_tickets
  where user_id = any(delete_user_ids);

  update public.support_tickets
  set replied_by = null
  where replied_by = any(delete_user_ids);

  delete from public.reports
  where reporter_id = any(delete_user_ids);

  update public.reports
  set reviewed_by = null
  where reviewed_by = any(delete_user_ids);

  update public.verification_requests
  set reviewed_by = null
  where reviewed_by = any(delete_user_ids);

  update public.orders
  set reviewed_by = null
  where reviewed_by = any(delete_user_ids);

  update public.lead_history
  set author_id = null
  where author_id = any(delete_user_ids);

  -- This optional audit table was introduced by migration 015. Some projects
  -- do not have it yet, so only touch it when it actually exists.
  if to_regclass('public.admin_card_access_log') is not null then
    execute
      'delete from public.admin_card_access_log where admin_id = any($1)'
      using delete_user_ids;
  end if;

  -- Cards, leads, notifications, subscriptions and promotion claims cascade
  -- from profiles. Remaining user-owned records cascade from auth.users.
  delete from auth.users
  where id = any(delete_user_ids);

  create unique index if not exists organizations_one_per_owner
    on public.organizations(owner_id);
end;
$cleanup$;

-- Expected result: no organizations and only the preserved user/admin rows.
select u.id, u.email, p.full_name, p.role
from auth.users u
left join public.profiles p on p.id = u.id
order by p.role desc, u.email;

select count(*) as organizations_remaining
from public.organizations;
