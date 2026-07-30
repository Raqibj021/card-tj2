-- Reliable public leads and atomic owner CRM updates.

create or replace function public.submit_public_lead(
  target_card_id uuid,
  client_name text,
  phone text,
  email text default '',
  service text default '',
  message text default '',
  source text default 'request'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  card_owner uuid;
  new_lead_id uuid;
  clean_name text := trim(coalesce(client_name, ''));
  clean_phone text := regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g');
  clean_email text := lower(trim(coalesce(email, '')));
begin
  if length(clean_name) < 2 or length(clean_name) > 80 then
    raise exception 'Invalid client name';
  end if;
  if clean_phone !~ '^[0-9]{9,15}$' then
    raise exception 'Invalid phone number';
  end if;
  if clean_email <> '' and clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email address';
  end if;
  if length(trim(coalesce(service, ''))) > 120 or length(trim(coalesce(message, ''))) > 1000 then
    raise exception 'Lead content is too long';
  end if;
  if source not in ('contact', 'callback', 'request') then
    raise exception 'Invalid lead source';
  end if;

  select owner_id into card_owner
  from public.cards
  where id = target_card_id
    and review_status = 'approved'
    and visibility in ('public', 'public_organization');
  if card_owner is null then raise exception 'Card unavailable'; end if;

  if exists (
    select 1
    from public.leads l
    where l.card_id = target_card_id
      and regexp_replace(l.phone, '[^0-9]', '', 'g') = clean_phone
      and l.created_at > now() - interval '60 seconds'
  ) then
    raise exception 'Please wait before sending another request';
  end if;

  insert into public.leads (
    card_id, owner_id, client_name, phone, email, service, message, source
  )
  values (
    target_card_id, card_owner, clean_name, clean_phone, clean_email,
    trim(coalesce(service, '')), trim(coalesce(message, '')), source
  )
  returning id into new_lead_id;

  insert into public.lead_history (lead_id, event_text)
  values (new_lead_id, 'Обращение создано');

  return new_lead_id;
end;
$$;

create or replace function public.update_owned_lead(
  target_lead_id uuid,
  next_status text default null,
  next_payment_status text default null,
  next_notes text default null,
  next_service text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_lead public.leads%rowtype;
  event_parts text[] := array[]::text[];
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into current_lead
  from public.leads
  where id = target_lead_id and owner_id = auth.uid()
  for update;
  if not found then raise exception 'Lead not found'; end if;

  if next_status is not null and next_status not in ('new', 'contacted', 'in_progress', 'completed') then
    raise exception 'Invalid lead status';
  end if;
  if next_payment_status is not null and next_payment_status not in ('not_required', 'pending', 'paid') then
    raise exception 'Invalid payment status';
  end if;
  if next_notes is not null and length(next_notes) > 4000 then raise exception 'Notes are too long'; end if;
  if next_service is not null and length(next_service) > 120 then raise exception 'Service is too long'; end if;

  if next_status is not null and next_status <> current_lead.status then
    event_parts := array_append(event_parts, 'Статус изменён: ' || next_status);
  end if;
  if next_payment_status is not null and next_payment_status <> current_lead.payment_status then
    event_parts := array_append(event_parts, 'Статус оплаты: ' || next_payment_status);
  end if;
  if next_service is not null and next_service <> current_lead.service then
    event_parts := array_append(event_parts, 'Выбранная услуга обновлена');
  end if;
  if next_notes is not null and next_notes <> current_lead.notes then
    event_parts := array_append(event_parts, 'Внутренняя заметка обновлена');
  end if;

  update public.leads
  set
    status = coalesce(next_status, status),
    payment_status = coalesce(next_payment_status, payment_status),
    notes = coalesce(next_notes, notes),
    service = coalesce(next_service, service),
    updated_at = now()
  where id = target_lead_id;

  if cardinality(event_parts) > 0 then
    insert into public.lead_history (lead_id, author_id, event_text)
    values (target_lead_id, auth.uid(), array_to_string(event_parts, ' · '));
  end if;
end;
$$;

create or replace function public.add_owned_lead_history(
  target_lead_id uuid,
  history_event text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if length(trim(coalesce(history_event, ''))) < 2 or length(trim(history_event)) > 500 then
    raise exception 'Invalid history event';
  end if;
  if not exists (
    select 1 from public.leads
    where id = target_lead_id and owner_id = auth.uid()
  ) then
    raise exception 'Lead not found';
  end if;

  insert into public.lead_history (lead_id, author_id, event_text)
  values (target_lead_id, auth.uid(), trim(history_event));
  update public.leads set updated_at = now() where id = target_lead_id;
end;
$$;

revoke all on function public.submit_public_lead(uuid, text, text, text, text, text, text) from public;
grant execute on function public.submit_public_lead(uuid, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.update_owned_lead(uuid, text, text, text, text) to authenticated;
grant execute on function public.add_owned_lead_history(uuid, text) to authenticated;
