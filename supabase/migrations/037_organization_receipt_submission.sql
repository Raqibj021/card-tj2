-- VIZORA.TJ: organization applications submit their payment receipt immediately.
-- The organization and its payment remain two independent administrator reviews
-- and therefore produce two independent user notifications.

create or replace function public.submit_payment_request(
  customer_name text,
  customer_phone text,
  selected_plan text,
  payment_sender_name text,
  uploaded_receipt_path text,
  target_organization_id uuid default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, storage, extensions
as $$
declare
  result public.orders%rowtype;
  target_org public.organizations%rowtype;
  expected_amount numeric(10,2);
  clean_name text := trim(coalesce(customer_name,''));
  clean_phone text := regexp_replace(coalesce(customer_phone,''), '\D', '', 'g');
  clean_sender text := trim(coalesce(payment_sender_name,''));
  clean_receipt text := trim(coalesce(uploaded_receipt_path,''));
  organization_plan boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if char_length(clean_name) not between 2 and 100 then raise exception 'Enter the customer full name'; end if;
  if clean_name !~ '^[[:alpha:]А-Яа-яЁёІіӢӣҚқӮӯҲҳҶҷҒғ'' .-]+$' then raise exception 'The full name contains invalid characters'; end if;
  if char_length(clean_phone) not between 9 and 15 then raise exception 'Enter a valid phone number'; end if;
  if char_length(clean_sender) not between 2 and 100 then raise exception 'Enter the payment sender name'; end if;

  expected_amount := case selected_plan
    when 'personal' then 20 when 'specialist' then 50 when 'pro' then 100
    when 'start' then 200 when 'business' then 300 when 'organization_pro' then 500
    else null end;
  if expected_amount is null then raise exception 'Unknown tariff'; end if;
  organization_plan := selected_plan in ('start','business','organization_pro');

  if organization_plan then
    select * into target_org from public.organizations
    where id=target_organization_id and owner_id=auth.uid() for update;
    if target_org.id is null then raise exception 'Organization application is not linked to this payment'; end if;
    if target_org.plan_code <> selected_plan then raise exception 'Выбранный тариф не совпадает с заявкой организации.'; end if;
  elsif target_organization_id is not null then
    raise exception 'A personal tariff cannot be linked to an organization';
  end if;

  select * into result from public.orders
  where user_id=auth.uid() and plan_code=selected_plan
    and organization_id is not distinct from target_organization_id
    and status in ('active','payment_pending','payment_review')
  order by case when status='active' then 0 else 1 end,
    activated_at desc nulls last, created_at desc limit 1;
  if result.id is not null then return result; end if;

  if split_part(clean_receipt,'/',1) <> auth.uid()::text or not exists (
    select 1 from storage.objects where bucket_id='payment-receipts'
      and name=clean_receipt and owner_id=auth.uid()::text
  ) then raise exception 'Payment receipt was not uploaded by this account'; end if;

  insert into public.orders(
    user_id, organization_id, order_number, plan_code, amount_somoni,
    payer_name, receipt_path, customer_snapshot, status
  ) values (
    auth.uid(), target_organization_id,
    'VZ-' || extract(year from now())::int || '-' || upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,10)),
    selected_plan, expected_amount, clean_sender, clean_receipt,
    jsonb_build_object('fullName',clean_name,'phone',clean_phone), 'payment_review'
  ) returning * into result;

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'payment_submitted',jsonb_build_object(
    'orderId',result.id,'number',result.order_number,'planCode',selected_plan,
    'organizationId',target_organization_id,'amount',expected_amount));
  return result;
end;
$$;

revoke all on function public.submit_payment_request(text,text,text,text,text,uuid) from public;
grant execute on function public.submit_payment_request(text,text,text,text,text,uuid) to authenticated;
