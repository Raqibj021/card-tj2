-- ONE-TIME DESTRUCTIVE CLEANUP FOR THE PRE-LAUNCH DATABASE.
-- Keeps:
--   1) the account of Муродзода Мухаммад (matched by name or mr_design@bk.ru)
--   2) the Vizora system administrator (vizora.platform.tj@gmail.com)
--   3) every account that already has profile role = admin (safety guard)
-- Deletes every organization and every other registered account.
-- Run manually in Supabase SQL Editor, review the final result and do not add
-- this file to an automatic migration workflow.

begin;

create temporary table vizora_keep_users(id uuid primary key) on commit drop;

insert into vizora_keep_users(id)
select u.id
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

-- Refuse to proceed if the requested main account was not found.
do $$
begin
  if not exists (
    select 1
    from auth.users u
    left join public.profiles p on p.id = u.id
    join vizora_keep_users k on k.id = u.id
    where lower(coalesce(u.email, '')) = 'mr_design@bk.ru'
       or (lower(coalesce(p.full_name, '')) like '%муродзода%'
           and lower(coalesce(p.full_name, '')) like '%мухаммад%')
  ) then
    raise exception 'ОСТАНОВЛЕНО: аккаунт Муродзода Мухаммад не найден. Ничего не удалено.';
  end if;
end;
$$;

create temporary table vizora_delete_users(id uuid primary key) on commit drop;
insert into vizora_delete_users(id)
select id from auth.users
where id not in (select id from vizora_keep_users);

-- Remove organization commerce records before organizations because the
-- orders table intentionally uses restrictive foreign keys.
delete from public.contracts
where organization_id is not null
   or user_id in (select id from vizora_delete_users);

delete from public.service_orders
where organization_id is not null
   or user_id in (select id from vizora_delete_users);

delete from public.orders
where organization_id is not null
   or plan_code in ('start', 'business', 'organization_pro')
   or user_id in (select id from vizora_delete_users);

delete from public.verification_requests
where organization_id is not null
   or profile_id in (select id from vizora_delete_users);

-- All organization children (members, departments, invitations and employee
-- assignments) are removed by their ON DELETE CASCADE constraints.
delete from public.organizations;

-- Remove organization-only subscriptions and messages from the kept accounts.
delete from public.subscriptions
where plan_code in ('start', 'business', 'organization_pro')
   or profile_id in (select id from vizora_delete_users);

delete from public.notifications
where user_id in (select id from vizora_delete_users)
   or kind like 'organization_%';

delete from public.support_tickets
where user_id in (select id from vizora_delete_users);

update public.support_tickets set replied_by = null
where replied_by in (select id from vizora_delete_users);

delete from public.reports
where reporter_id in (select id from vizora_delete_users);

update public.reports set reviewed_by = null
where reviewed_by in (select id from vizora_delete_users);

update public.verification_requests set reviewed_by = null
where reviewed_by in (select id from vizora_delete_users);

update public.orders set reviewed_by = null
where reviewed_by in (select id from vizora_delete_users);

update public.lead_history set author_id = null
where author_id in (select id from vizora_delete_users);

-- Cards, leads, notifications, subscriptions and promo claims cascade from
-- profiles. Service orders and contracts cascade from auth.users.
delete from auth.users
where id in (select id from vizora_delete_users);

-- From this point an account can never create a second organization record.
create unique index if not exists organizations_one_per_owner
  on public.organizations(owner_id);

commit;

-- Expected result: no organizations and only the preserved user/admin rows.
select u.id, u.email, p.full_name, p.role
from auth.users u
left join public.profiles p on p.id = u.id
order by p.role desc, u.email;

select count(*) as organizations_remaining from public.organizations;
