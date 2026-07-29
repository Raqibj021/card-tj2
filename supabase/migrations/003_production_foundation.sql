-- Production foundation: secure roles, file storage, trials, moderation and activation.
-- Run after schema.sql / migrations 001-002.

alter table public.cards
  add column if not exists trial_expires_at timestamptz,
  add column if not exists published_at timestamptz;

alter table public.orders
  add column if not exists activation_code_hash text,
  add column if not exists activation_code_expires_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists customer_snapshot jsonb not null default '{}'::jsonb;

alter table public.support_tickets
  add column if not exists contact_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists reference_number text not null default '';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('card-assets', 'card-assets', true, 5242880, array['image/png','image/jpeg','image/webp']),
  ('payment-receipts', 'payment-receipts', false, 5242880, array['image/png','image/jpeg','application/pdf']),
  ('verification-documents', 'verification-documents', false, 10485760, array['image/png','image/jpeg','application/pdf'])
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "card assets public read" on storage.objects for select
  using (bucket_id = 'card-assets');
create policy "card assets owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'card-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "card assets owner update" on storage.objects for update to authenticated
  using (bucket_id = 'card-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "card assets owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'card-assets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts owner read" on storage.objects for select to authenticated
  using (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verification owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "verification owner read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('moderator', 'admin')
  );
$$;

create policy "staff read profiles" on public.profiles for select using (public.is_staff());
create policy "staff manage cards" on public.cards for all using (public.is_staff());
create policy "staff manage organizations" on public.organizations for all using (public.is_staff());
create policy "staff manage orders" on public.orders for all using (public.is_staff());
create policy "staff manage verifications" on public.verification_requests for all using (public.is_staff());
create policy "staff manage tickets" on public.support_tickets for all using (public.is_staff());
create policy "staff manage reports" on public.reports for all using (public.is_staff());
create policy "staff read leads" on public.leads for select using (public.is_staff());

insert into public.profession_categories
  (name_ru, name_tj, name_en, slug, enabled, requires_license)
values
  ('Врачи и клиники', 'Табибон ва клиникаҳо', 'Doctors and clinics', 'medicine', true, true),
  ('Юристы', 'Ҳуқуқшиносон', 'Lawyers', 'law', true, true),
  ('Переводчики', 'Тарҷумонҳо', 'Translators', 'translation', true, false),
  ('Преподаватели', 'Омӯзгорон', 'Teachers', 'education', true, false),
  ('Ремонт и мастера', 'Таъмир ва устоҳо', 'Repair and trades', 'repair', true, false),
  ('Фото и дизайн', 'Акс ва дизайн', 'Photography and design', 'photo-design', true, false),
  ('Компании', 'Ширкатҳо', 'Companies', 'companies', true, false),
  ('Другие разрешённые специалисты', 'Дигар мутахассисони иҷозатшуда', 'Other permitted specialists', 'other', true, false)
on conflict (slug) do update set enabled = excluded.enabled, requires_license = excluded.requires_license;

create table if not exists public.prohibited_profile_terms (
  term text primary key,
  reason text not null default 'Запрещённая категория'
);
alter table public.prohibited_profile_terms enable row level security;
create policy "prohibited terms public read" on public.prohibited_profile_terms for select using (true);
create policy "staff manage prohibited terms" on public.prohibited_profile_terms for all using (public.is_staff());
insert into public.prohibited_profile_terms (term) values
  ('массаж'), ('массажист'), ('косметолог'), ('косметология'),
  ('massage'), ('masseur'), ('cosmetologist'), ('cosmetology')
on conflict do nothing;

create or replace function public.enforce_allowed_card_content()
returns trigger language plpgsql set search_path = public
as $$
declare blocked text;
declare combined text := lower(coalesce(new.position,'') || ' ' || coalesce(new.organization_name,'') || ' ' || coalesce(new.description,''));
begin
  select term into blocked from public.prohibited_profile_terms
  where combined like '%' || lower(term) || '%' limit 1;
  if blocked is not null then
    raise exception 'This profession or service is not allowed on Vizora';
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_allowed_card_content_trigger on public.cards;
create trigger enforce_allowed_card_content_trigger
  before insert or update of position, organization_name, description on public.cards
  for each row execute procedure public.enforce_allowed_card_content();

create or replace function public.request_card_review(target_card_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.subscriptions
    where profile_id = auth.uid() and expires_at > now()
  ) then
    raise exception 'Active plan required';
  end if;
  if exists (
    select 1 from public.cards c
    join public.profession_categories p on p.id = c.profession_category_id
    where c.id = target_card_id and p.requires_license
      and not exists (
        select 1 from public.verification_requests v
        where v.card_id = c.id and cardinality(v.document_paths) > 0
      )
  ) then
    raise exception 'Verification documents required';
  end if;
  update public.cards
  set review_status = 'pending', visibility = 'private', updated_at = now()
  where id = target_card_id and owner_id = auth.uid();
  if not found then raise exception 'Card not found'; end if;
end;
$$;
grant execute on function public.request_card_review(uuid) to authenticated;

create or replace function public.review_card(
  target_card_id uuid,
  decision public.review_status,
  note text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if decision not in ('approved', 'changes_requested', 'rejected', 'suspended') then
    raise exception 'Invalid review decision';
  end if;
  update public.cards set
    review_status = decision,
    visibility = case when decision = 'approved' then 'public'::public.card_visibility else 'private'::public.card_visibility end,
    verified_at = case when decision = 'approved' then now() else verified_at end,
    published_at = case when decision = 'approved' then now() else published_at end,
    trial_expires_at = case when decision = 'approved' then null else trial_expires_at end,
    updated_at = now()
  where id = target_card_id;
  insert into public.verification_requests (profile_id, card_id, status, reviewer_note, reviewed_by, reviewed_at)
  select owner_id, id, decision, trim(note), auth.uid(), now()
  from public.cards where id = target_card_id;
end;
$$;
grant execute on function public.review_card(uuid, public.review_status, text) to authenticated;

create or replace function public.cleanup_expired_card_trials()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare removed integer;
begin
  delete from public.cards
  where review_status = 'draft'
    and trial_expires_at is not null
    and trial_expires_at < now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;
grant execute on function public.cleanup_expired_card_trials() to anon, authenticated;

create or replace function public.submit_support_ticket(
  contact_name text,
  contact_phone text,
  ticket_category text,
  reference_number text,
  ticket_message text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare generated_number text;
begin
  if length(trim(contact_name)) < 2 or length(trim(contact_phone)) < 5
    or length(trim(ticket_message)) < 5 then
    raise exception 'Invalid support request';
  end if;
  generated_number := 'SUP-' || to_char(now(), 'YYMMDD') || '-'
    || upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 6));
  insert into public.support_tickets (
    user_id, ticket_number, category, subject, message,
    contact_snapshot, reference_number
  ) values (
    auth.uid(), generated_number, trim(ticket_category), trim(ticket_category),
    trim(ticket_message),
    jsonb_build_object('name', trim(contact_name), 'phone', trim(contact_phone)),
    trim(reference_number)
  );
  return generated_number;
end;
$$;
grant execute on function public.submit_support_ticket(text, text, text, text, text) to anon, authenticated;

create or replace function public.submit_card_report(
  target_card_id uuid,
  report_reason text,
  report_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
declare report_count integer;
begin
  if length(trim(report_reason)) < 3 then raise exception 'Invalid report'; end if;
  if not exists (
    select 1 from public.cards where id = target_card_id
      and review_status = 'approved'
      and visibility in ('public', 'public_organization')
  ) then raise exception 'Card unavailable'; end if;
  insert into public.reports (reporter_id, card_id, reason, details)
  values (auth.uid(), target_card_id, trim(report_reason), trim(report_details))
  returning id into new_id;
  select count(*) into report_count from public.reports
  where card_id = target_card_id and status = 'new';
  if report_count >= 3 then
    update public.cards set review_status = 'suspended', visibility = 'private', updated_at = now()
    where id = target_card_id;
  end if;
  return new_id;
end;
$$;
grant execute on function public.submit_card_report(uuid, text, text) to anon, authenticated;

create or replace function public.approve_order(target_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare plain_code text;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  plain_code := 'VZ-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4))
    || '-' || upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 4));
  update public.orders set
    activation_code_hash = encode(digest(plain_code, 'sha256'), 'hex'),
    activation_code_expires_at = now() + interval '7 days',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    status = 'payment_review',
    updated_at = now()
  where id = target_order_id and status in ('payment_pending', 'payment_review');
  if not found then raise exception 'Order unavailable'; end if;
  return plain_code;
end;
$$;
grant execute on function public.approve_order(uuid) to authenticated;

create or replace function public.activate_plan(plain_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare selected_order public.orders%rowtype;
declare plan_expiry timestamptz := now() + interval '1 year';
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into selected_order from public.orders
  where user_id = auth.uid()
    and activation_code_hash = encode(digest(upper(trim(plain_code)), 'sha256'), 'hex')
    and activation_code_expires_at > now()
    and activated_at is null
  order by created_at desc limit 1;
  if selected_order.id is null then raise exception 'Invalid or expired activation code'; end if;

  update public.orders set status = 'active', activated_at = now(), updated_at = now()
  where id = selected_order.id;
  insert into public.subscriptions (profile_id, plan_code, source, expires_at)
  values (auth.uid(), selected_order.plan_code, 'payment', plan_expiry)
  on conflict (profile_id) do update set
    plan_code = excluded.plan_code, source = excluded.source,
    starts_at = now(), expires_at = excluded.expires_at;
  if selected_order.organization_id is not null then
    update public.organizations set
      plan_code = selected_order.plan_code,
      employee_limit = case selected_order.plan_code
        when 'start' then 20 when 'business' then 50 else 100 end,
      active_until = plan_expiry,
      updated_at = now()
    where id = selected_order.organization_id and owner_id = auth.uid();
  end if;
  return selected_order.plan_code;
end;
$$;
grant execute on function public.activate_plan(text) to authenticated;

create or replace function public.add_organization_owner()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, profile_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;
drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
  after insert on public.organizations
  for each row execute procedure public.add_organization_owner();
