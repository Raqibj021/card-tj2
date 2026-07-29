-- VIZORA.TJ: production admin console and one-time official launch controls.
-- Run after 006_commerce_management_fix.sql.

create table if not exists public.platform_settings (
  id boolean primary key default true check (id),
  launch_status text not null default 'prelaunch' check (launch_status in ('prelaunch','live')),
  official_launch_at timestamptz,
  promotion_limit integer not null default 50 check (promotion_limit > 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.platform_settings (id) values (true) on conflict (id) do nothing;
alter table public.platform_settings enable row level security;
alter table public.admin_audit_log enable row level security;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "staff read platform settings" on public.platform_settings;
create policy "staff read platform settings" on public.platform_settings
for select using (public.is_staff());
drop policy if exists "admins read audit log" on public.admin_audit_log;
create policy "admins read audit log" on public.admin_audit_log
for select using (public.is_platform_admin());

create or replace function public.get_admin_console_snapshot()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  select jsonb_build_object(
    'status', s.launch_status,
    'officialLaunchAt', s.official_launch_at,
    'promotionLimit', s.promotion_limit,
    'promotionClaimed', (select count(*) from public.launch_promo_claims),
    'users', (select count(*) from public.profiles where role = 'user'),
    'cards', (select count(*) from public.cards),
    'publicCards', (select count(*) from public.cards where review_status = 'approved'),
    'organizations', (select count(*) from public.organizations),
    'employees', (select count(*) from public.employee_assignments),
    'pendingReviews', (
      (select count(*) from public.cards where review_status = 'pending') +
      (select count(*) from public.verification_requests where status = 'pending')
    ),
    'pendingPayments', (select count(*) from public.orders where status = 'payment_review'),
    'leads', (select count(*) from public.leads),
    'openTickets', (select count(*) from public.support_tickets where status in ('new','open','in_progress')),
    'serviceOrders', (select count(*) from public.service_orders),
    'contracts', (select count(*) from public.contracts),
    'queuedEmails', (select count(*) from public.email_outbox where status in ('queued','sending')),
    'views', (select coalesce(sum(views),0) from public.cards),
    'revenue', (
      select coalesce(sum(amount_somoni),0) from public.orders where status = 'active'
    ) + (
      select coalesce(sum(total),0) from public.service_orders where payment_status = 'paid'
    ),
    'recentCards', coalesce((select jsonb_agg(item) from (
      select jsonb_build_object('id',id,'name',full_name,'slug',slug,'status',review_status,'createdAt',created_at) item
      from public.cards order by created_at desc limit 8
    ) q), '[]'::jsonb),
    'recentOrganizations', coalesce((select jsonb_agg(item) from (
      select jsonb_build_object(
        'id',o.id,'name',o.display_name,'status',o.review_status,'createdAt',o.created_at,
        'employees',(select count(*) from public.employee_assignments e where e.organization_id=o.id)
      ) item from public.organizations o order by o.created_at desc limit 8
    ) q), '[]'::jsonb),
    'recentPayments', coalesce((select jsonb_agg(item) from (
      select jsonb_build_object(
        'id',id,'number',order_number,
        'customer',coalesce(customer_snapshot->>'fullName',payer_name,''),
        'amount',amount_somoni,'status',status,'createdAt',created_at
      ) item from public.orders order by created_at desc limit 8
    ) q), '[]'::jsonb),
    'recentTickets', coalesce((select jsonb_agg(item) from (
      select jsonb_build_object('id',id,'number',ticket_number,'subject',subject,'status',status,'createdAt',created_at) item
      from public.support_tickets order by created_at desc limit 8
    ) q), '[]'::jsonb)
  ) into result from public.platform_settings s where s.id = true;
  return result;
end;
$$;

create or replace function public.get_prelaunch_cleanup_preview()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if (select launch_status from public.platform_settings where id=true) <> 'prelaunch' then
    raise exception 'Platform is already live';
  end if;
  select jsonb_build_object(
    'users',(select count(*) from public.profiles where role='user'),
    'cards',(select count(*) from public.cards c join public.profiles p on p.id=c.owner_id where p.role='user'),
    'organizations',(select count(*) from public.organizations o join public.profiles p on p.id=o.owner_id where p.role='user'),
    'leads',(select count(*) from public.leads),
    'orders',(select count(*) from public.orders o join public.profiles p on p.id=o.user_id where p.role='user'),
    'tickets',(select count(*) from public.support_tickets where user_id is null or user_id in (select id from public.profiles where role='user'))
  ) into result;
  return result;
end;
$$;

create or replace function public.reset_prelaunch_data(confirmation text)
returns jsonb language plpgsql security definer set search_path = public, auth
as $$
declare preview jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if confirmation <> 'ОЧИСТИТЬ ТЕСТОВЫЕ ДАННЫЕ' then raise exception 'Invalid confirmation phrase'; end if;
  if (select launch_status from public.platform_settings where id=true for update) <> 'prelaunch' then
    raise exception 'Cleanup is permanently disabled after launch';
  end if;
  preview := public.get_prelaunch_cleanup_preview();

  delete from public.verification_requests where profile_id in (select id from public.profiles where role='user');
  delete from public.reports where reporter_id in (select id from public.profiles where role='user');
  delete from public.orders where user_id in (select id from public.profiles where role='user');
  delete from public.support_tickets where user_id is null or user_id in (select id from public.profiles where role='user');
  delete from public.organizations where owner_id in (select id from public.profiles where role='user');
  delete from public.cards where owner_id in (select id from public.profiles where role='user');
  delete from auth.users where id in (select id from public.profiles where role='user');

  perform setval(pg_get_serial_sequence('public.launch_promo_claims','id'), 1, false);
  insert into public.admin_audit_log(admin_id,action,details)
  values (auth.uid(),'prelaunch_data_reset',preview);
  return preview;
end;
$$;

create or replace function public.begin_official_launch(confirmation text)
returns timestamptz language plpgsql security definer set search_path = public
as $$
declare launched_at timestamptz := now();
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if confirmation <> 'ЗАПУСТИТЬ VIZORA' then raise exception 'Invalid confirmation phrase'; end if;
  if exists (select 1 from public.launch_promo_claims) then
    raise exception 'Clear prelaunch promotion claims before the official launch';
  end if;
  update public.platform_settings set
    launch_status='live', official_launch_at=launched_at,
    updated_by=auth.uid(), updated_at=launched_at
  where id=true and launch_status='prelaunch';
  if not found then raise exception 'Platform is already live'; end if;
  insert into public.admin_audit_log(admin_id,action,details)
  values (auth.uid(),'official_launch',jsonb_build_object('launchedAt',launched_at,'promotionLimit',50));
  return launched_at;
end;
$$;

create or replace function public.claim_launch_promo()
returns table (claimed boolean, place_number bigint, expires_at timestamptz)
language plpgsql security definer set search_path = public, auth
as $$
declare
  new_place bigint;
  promo_expiry timestamptz := now() + interval '1 year';
  promo_limit integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select promotion_limit into promo_limit from public.platform_settings
    where id=true and launch_status='live';
  if promo_limit is null then raise exception 'The launch promotion has not started yet'; end if;
  if not exists (select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then
    raise exception 'Email verification required';
  end if;
  select id into new_place from public.launch_promo_claims where profile_id=auth.uid();
  if new_place is null then
    lock table public.launch_promo_claims in exclusive mode;
    if (select count(*) from public.launch_promo_claims) >= promo_limit then
      return query select false,null::bigint,null::timestamptz; return;
    end if;
    insert into public.launch_promo_claims(profile_id) values(auth.uid()) returning id into new_place;
    insert into public.subscriptions(profile_id,plan_code,source,expires_at)
    values(auth.uid(),'personal','launch_promo',promo_expiry) on conflict(profile_id) do nothing;
  else
    select s.expires_at into promo_expiry from public.subscriptions s where s.profile_id=auth.uid();
  end if;
  return query select true,new_place,promo_expiry;
end;
$$;

grant execute on function public.get_admin_console_snapshot() to authenticated;
grant execute on function public.get_prelaunch_cleanup_preview() to authenticated;
grant execute on function public.reset_prelaunch_data(text) to authenticated;
grant execute on function public.begin_official_launch(text) to authenticated;
grant execute on function public.claim_launch_promo() to authenticated;
