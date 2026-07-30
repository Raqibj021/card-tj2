-- VIZORA.TJ: authoritative payment submission, activation and launch promotion.
-- Run after 020_lead_delivery_integrity.sql.

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
    if target_organization_id is null or not exists (
      select 1 from public.organizations
      where id=target_organization_id and owner_id=auth.uid()
    ) then raise exception 'Organization application is not linked to this payment'; end if;
  elsif target_organization_id is not null then
    raise exception 'A personal tariff cannot be linked to an organization';
  end if;

  if split_part(clean_receipt,'/',1) <> auth.uid()::text or not exists (
    select 1 from storage.objects
    where bucket_id='payment-receipts' and name=clean_receipt and owner_id=auth.uid()::text
  ) then raise exception 'Payment receipt was not uploaded by this account'; end if;

  if exists (
    select 1 from public.orders
    where user_id=auth.uid()
      and plan_code=selected_plan
      and organization_id is not distinct from target_organization_id
      and status in ('payment_pending','payment_review')
  ) then raise exception 'This payment is already awaiting review'; end if;

  insert into public.orders(
    user_id, organization_id, order_number, plan_code, amount_somoni,
    payer_name, receipt_path, customer_snapshot, status
  ) values (
    auth.uid(), target_organization_id,
    'VZ-' || extract(year from now())::int || '-' || upper(substr(encode(extensions.gen_random_bytes(5),'hex'),1,10)),
    selected_plan, expected_amount, clean_sender, clean_receipt,
    jsonb_build_object('fullName',clean_name,'phone',clean_phone),
    'payment_review'
  ) returning * into result;

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'payment_submitted',jsonb_build_object(
    'orderId',result.id,'number',result.order_number,'planCode',selected_plan,
    'organizationId',target_organization_id,'amount',expected_amount
  ));
  return result;
end;
$$;

revoke all on function public.submit_payment_request(text,text,text,text,text,uuid) from public;
grant execute on function public.submit_payment_request(text,text,text,text,text,uuid) to authenticated;

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
  if exists (select 1 from public.organizations where owner_id=auth.uid()) then
    raise exception 'The launch offer is only for personal accounts';
  end if;
  if not exists (
    select 1 from public.cards
    where owner_id=auth.uid()
      and char_length(trim(full_name)) >= 2
      and char_length(trim(position)) >= 2
      and char_length(trim(organization_name)) >= 2
      and char_length(regexp_replace(coalesce(contacts->>'phone',''),'\D','','g')) between 9 and 15
  ) then raise exception 'Complete a valid personal card before claiming the offer'; end if;

  select id into new_place from public.launch_promo_claims where profile_id=auth.uid();
  if new_place is null then
    lock table public.launch_promo_claims in exclusive mode;
    if (select count(*) from public.launch_promo_claims) >= promo_limit then
      return query select false,null::bigint,null::timestamptz; return;
    end if;
    insert into public.launch_promo_claims(profile_id) values(auth.uid()) returning id into new_place;
    insert into public.subscriptions(profile_id,plan_code,source,starts_at,expires_at)
    values(auth.uid(),'personal','launch_promo',now(),promo_expiry)
    on conflict(profile_id) do update set
      plan_code='personal', source='launch_promo', starts_at=now(), expires_at=promo_expiry;
  else
    select s.expires_at into promo_expiry from public.subscriptions s where s.profile_id=auth.uid();
  end if;
  return query select true,new_place,promo_expiry;
end;
$$;

grant execute on function public.claim_launch_promo() to authenticated;

create or replace function public.request_card_review(target_card_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  promo_result record;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.cards where id=target_card_id and owner_id=auth.uid()
  ) then raise exception 'Card not found'; end if;

  -- A valid personal card can take one of the first 50 launch places exactly
  -- when its owner deliberately sends it for review, never merely on login.
  if not exists (
    select 1 from public.subscriptions where profile_id=auth.uid() and expires_at > now()
  ) then
    select * into promo_result from public.claim_launch_promo();
    if not coalesce(promo_result.claimed,false) then
      raise exception 'The free launch places have ended. Choose a personal tariff.';
    end if;
  end if;

  if exists (
    select 1 from public.cards c
    join public.profession_categories p on p.id=c.profession_category_id
    where c.id=target_card_id and p.requires_license
      and not exists (
        select 1 from public.verification_requests v
        where v.card_id=c.id and cardinality(v.document_paths)>0
      )
  ) then raise exception 'Verification documents required'; end if;

  update public.cards
  set review_status='pending', visibility='private', updated_at=now()
  where id=target_card_id and owner_id=auth.uid();
end;
$$;

grant execute on function public.request_card_review(uuid) to authenticated;

-- Legacy activation codes must not reactivate or alter an order.
create or replace function public.activate_plan(plain_code text)
returns text language plpgsql security definer set search_path = public
as $$
begin
  raise exception 'Tariffs are activated automatically after administrator approval';
end;
$$;
