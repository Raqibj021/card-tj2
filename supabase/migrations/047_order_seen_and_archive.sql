-- Orders: track when an admin opened an order and whether it was archived.
-- Additive only: two nullable columns, and two admin counters now ignore opened/archived orders.

alter table public.service_orders add column if not exists admin_seen_at timestamptz;
alter table public.service_orders add column if not exists archived_at timestamptz;

-- Orders already past "new" were handled before this change, so mark them as seen.
update public.service_orders
set admin_seen_at = coalesce(updated_at, now())
where status <> 'new' and admin_seen_at is null;

-- Replace only the counting line in each function, and fail loudly if the pattern is not found.
do $$
declare def text; newdef text;
begin
  select pg_get_functiondef('public.get_admin_nav_counts()'::regprocedure) into def;
  newdef := replace(def,
    'select count(*) into services_count from public.service_orders where status = ''new'';',
    'select count(*) into services_count from public.service_orders where admin_seen_at is null and archived_at is null;');
  if newdef = def then raise exception 'get_admin_nav_counts: pattern not found'; end if;
  execute newdef;

  select pg_get_functiondef('public.get_admin_console_snapshot()'::regprocedure) into def;
  newdef := replace(def,
    '''serviceOrders'', (select count(*) from public.service_orders),',
    '''serviceOrders'', (select count(*) from public.service_orders where admin_seen_at is null and archived_at is null),');
  if newdef = def then raise exception 'get_admin_console_snapshot: pattern not found'; end if;
  execute newdef;
end $$;
