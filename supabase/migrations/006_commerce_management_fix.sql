-- VIZORA.TJ: fix commerce notifications and allow staff status management

drop policy if exists "Users manage own service orders" on public.service_orders;
create policy "Users read own service orders" on public.service_orders
for select using (auth.uid() = user_id or public.is_staff());
create policy "Users create own service orders" on public.service_orders
for insert with check (auth.uid() = user_id);
create policy "Staff update service orders" on public.service_orders
for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "Users manage own contracts" on public.contracts;
create policy "Users read own contracts" on public.contracts
for select using (auth.uid() = user_id or public.is_staff());
create policy "Users create own contracts" on public.contracts
for insert with check (auth.uid() = user_id);
create policy "Staff update contracts" on public.contracts
for update using (public.is_staff()) with check (public.is_staff());

create or replace function public.queue_commerce_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_body text;
  v_email text;
  v_action text;
begin
  if tg_table_name = 'service_orders' then
    v_title := case when tg_op = 'INSERT' then 'Заказ принят' else 'Статус заказа изменён' end;
    v_body := 'Заказ ' || new.order_number || ': ' || new.status || '.';
    v_action := '/dashboard/orders';
  else
    v_title := case when tg_op = 'INSERT' then 'Договор создан' else 'Статус договора изменён' end;
    v_body := 'Договор ' || new.contract_number || ': ' || new.status || '.';
    v_action := '/dashboard/orders';
  end if;

  insert into public.notifications(user_id, kind, title, body, action_url)
  values (new.user_id, 'service', v_title, v_body, v_action);

  select email into v_email from public.profiles where id = new.user_id;
  if coalesce(v_email, '') <> '' then
    insert into public.email_outbox(recipient, template_key, payload)
    values (
      v_email,
      case when tg_table_name = 'service_orders' then 'service_order_status' else 'contract_status' end,
      jsonb_build_object(
        'title', v_title,
        'message', v_body,
        'recordId', new.id,
        'actionUrl', v_action
      )
    );
  end if;
  return new;
end;
$$;

create or replace function public.get_commerce_admin_stats()
returns jsonb language sql stable security definer set search_path = public as $$
  select case when public.is_staff() then jsonb_build_object(
    'orders', (select count(*) from public.service_orders),
    'newOrders', (select count(*) from public.service_orders where status = 'new'),
    'unpaid', (select count(*) from public.service_orders where payment_status in ('unpaid','pending')),
    'revenue', (select coalesce(sum(total),0) from public.service_orders where payment_status = 'paid'),
    'contracts', (select count(*) from public.contracts)
  ) else '{}'::jsonb end;
$$;
grant execute on function public.get_commerce_admin_stats() to authenticated;

create index if not exists service_orders_status_idx on public.service_orders(status, created_at desc);
create index if not exists contracts_status_idx on public.contracts(status, created_at desc);
