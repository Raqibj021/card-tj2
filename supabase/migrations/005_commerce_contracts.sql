-- VIZORA.TJ: service orders, contracts and automatic service notifications

create sequence if not exists public.service_order_number_seq start 1001;
create sequence if not exists public.contract_number_seq start 1001;

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  order_number text not null unique default
    ('VZ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.service_order_number_seq')::text, 5, '0')),
  customer jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  quantity integer not null default 1 check (quantity > 0),
  digital_total numeric(12,2) not null default 0,
  design_total numeric(12,2) not null default 0,
  print_total numeric(12,2) not null default 0,
  materials_total numeric(12,2) not null default 0,
  extras_total numeric(12,2) not null default 0,
  total numeric(12,2) generated always as
    (digital_total + design_total + print_total + materials_total + extras_total) stored,
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','pending','paid','refunded')),
  status text not null default 'new'
    check (status in ('new','clarifying','approved','in_progress','ready','completed','cancelled')),
  manager_comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  contract_number text not null unique default
    ('Д-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.contract_number_seq')::text, 5, '0')),
  customer_type text not null default 'individual'
    check (customer_type in ('individual','organization')),
  customer jsonb not null default '{}'::jsonb,
  services jsonb not null default '[]'::jsonb,
  total numeric(12,2) not null default 0,
  status text not null default 'draft'
    check (status in ('draft','submitted','approved','signed','cancelled')),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_orders enable row level security;
alter table public.contracts enable row level security;

drop policy if exists "Users manage own service orders" on public.service_orders;
create policy "Users manage own service orders" on public.service_orders
for all using (
  auth.uid() = user_id or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','moderator')
  )
) with check (auth.uid() = user_id);

drop policy if exists "Users manage own contracts" on public.contracts;
create policy "Users manage own contracts" on public.contracts
for all using (
  auth.uid() = user_id or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin','moderator')
  )
) with check (auth.uid() = user_id);

create or replace function public.queue_commerce_notification()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_message text;
  v_email text;
begin
  if tg_table_name = 'service_orders' then
    v_title := case when tg_op = 'INSERT' then 'Заказ принят' else 'Статус заказа изменён' end;
    v_message := 'Заказ ' || new.order_number || ': ' || new.status || '.';
  else
    v_title := case when tg_op = 'INSERT' then 'Договор создан' else 'Статус договора изменён' end;
    v_message := 'Договор ' || new.contract_number || ': ' || new.status || '.';
  end if;

  insert into public.notifications(user_id, type, title, message, metadata)
  values (new.user_id, 'service', v_title, v_message, jsonb_build_object('record_id', new.id));

  select email into v_email from public.profiles where id = new.user_id;
  if coalesce(v_email, '') <> '' then
    insert into public.email_outbox(user_id, recipient, template_key, subject, payload)
    values (
      new.user_id, v_email,
      case when tg_table_name = 'service_orders' then 'service_order_status' else 'contract_status' end,
      v_title,
      jsonb_build_object('message', v_message, 'record_id', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists service_order_notification on public.service_orders;
create trigger service_order_notification
after insert or update of status, payment_status on public.service_orders
for each row execute function public.queue_commerce_notification();

drop trigger if exists contract_notification on public.contracts;
create trigger contract_notification
after insert or update of status on public.contracts
for each row execute function public.queue_commerce_notification();

create index if not exists service_orders_user_created_idx
  on public.service_orders(user_id, created_at desc);
create index if not exists contracts_user_created_idx
  on public.contracts(user_id, created_at desc);
