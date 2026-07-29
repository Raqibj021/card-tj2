-- VIZORA.TJ: reliable transactional email queue.
-- Run once after 007_admin_console_launch.sql.

alter table public.email_outbox
  add column if not exists subject text,
  add column if not exists provider_message_id text,
  add column if not exists locked_at timestamptz,
  add column if not exists next_attempt_at timestamptz;

alter table public.support_tickets
  add column if not exists staff_reply text not null default '',
  add column if not exists replied_by uuid references public.profiles(id) on delete set null,
  add column if not exists replied_at timestamptz;

create index if not exists email_outbox_delivery_idx
  on public.email_outbox(status, coalesce(next_attempt_at, scheduled_at), created_at)
  where status in ('queued','failed','sending');

create or replace function public.queue_transactional_email(
  target_recipient text,
  target_template text,
  target_payload jsonb default '{}'::jsonb,
  target_subject text default null,
  deliver_at timestamptz default now()
)
returns uuid language plpgsql security definer set search_path = public as $$
declare new_id uuid;
begin
  if trim(coalesce(target_recipient,'')) = '' then return null; end if;
  insert into public.email_outbox(recipient,template_key,payload,subject,status,scheduled_at,next_attempt_at)
  values(lower(trim(target_recipient)),target_template,coalesce(target_payload,'{}'::jsonb),
    target_subject,'queued',deliver_at,deliver_at)
  returning id into new_id;
  return new_id;
end;
$$;
revoke all on function public.queue_transactional_email(text,text,jsonb,text,timestamptz) from public, anon, authenticated;
grant execute on function public.queue_transactional_email(text,text,jsonb,text,timestamptz) to service_role;

create or replace function public.claim_email_batch(batch_size integer default 20)
returns setof public.email_outbox
language plpgsql security definer set search_path = public as $$
begin
  update public.email_outbox
  set status='failed', locked_at=null,
      last_error=coalesce(last_error,'') || ' Worker timeout',
      next_attempt_at=now()
  where status='sending' and locked_at < now() - interval '10 minutes';

  return query
  with candidates as (
    select id from public.email_outbox
    where status in ('queued','failed')
      and attempts < 5
      and coalesce(next_attempt_at,scheduled_at) <= now()
    order by created_at
    for update skip locked
    limit greatest(1,least(batch_size,50))
  )
  update public.email_outbox e
  set status='sending',locked_at=now(),attempts=e.attempts+1
  from candidates c where e.id=c.id
  returning e.*;
end;
$$;
revoke all on function public.claim_email_batch(integer) from public, anon, authenticated;
grant execute on function public.claim_email_batch(integer) to service_role;

create or replace function public.profile_email_payload(target_profile uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'fullName',coalesce(full_name,''),
    'language',coalesce(preferred_language,'ru')
  ) from public.profiles where id=target_profile;
$$;

create or replace function public.queue_profile_change_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.full_name is distinct from new.full_name
    or old.phone is distinct from new.phone
    or old.email is distinct from new.email then
    perform public.queue_transactional_email(
      coalesce(new.email,old.email),'data_changed',
      jsonb_build_object('fullName',new.full_name,'language',new.preferred_language,'actionUrl','/dashboard')
    );
  end if;
  return new;
end;
$$;
drop trigger if exists profile_change_email on public.profiles;
create trigger profile_change_email after update of full_name,phone,email on public.profiles
for each row execute function public.queue_profile_change_email();

create or replace function public.queue_card_review_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner public.profiles%rowtype;
declare template text;
declare note text;
begin
  if old.review_status is not distinct from new.review_status then return new; end if;
  select * into owner from public.profiles where id=new.owner_id;
  if new.review_status='changes_requested' then template := 'additional_documents';
  elsif new.review_status='suspended' then template := 'account_blocked';
  elsif new.review_status in ('approved','rejected') then template := 'verification_result';
  else return new;
  end if;
  select reviewer_note into note from public.verification_requests
    where card_id=new.id order by created_at desc limit 1;
  perform public.queue_transactional_email(owner.email,template,
    jsonb_build_object('fullName',owner.full_name,'language',owner.preferred_language,
      'status',new.review_status,'note',coalesce(note,''),'actionUrl','/dashboard'));
  return new;
end;
$$;
drop trigger if exists card_review_email on public.cards;
create trigger card_review_email after update of review_status on public.cards
for each row execute function public.queue_card_review_email();

drop function if exists public.submit_support_ticket(text,text,text,text,text);
create or replace function public.submit_support_ticket(
  contact_name text,
  contact_phone text,
  contact_email text,
  ticket_category text,
  reference_number text,
  ticket_message text
)
returns text language plpgsql security definer set search_path = public as $$
declare generated_number text;
begin
  if length(trim(contact_name)) < 2 or length(trim(contact_phone)) < 5
    or position('@' in trim(contact_email)) < 2 or length(trim(ticket_message)) < 5 then
    raise exception 'Invalid support request';
  end if;
  generated_number := 'SUP-' || to_char(now(),'YYMMDD') || '-'
    || upper(substr(encode(gen_random_bytes(5),'hex'),1,6));
  insert into public.support_tickets(
    user_id,ticket_number,category,subject,message,contact_snapshot,reference_number
  ) values (
    auth.uid(),generated_number,trim(ticket_category),trim(ticket_category),trim(ticket_message),
    jsonb_build_object('name',trim(contact_name),'phone',trim(contact_phone),'email',lower(trim(contact_email))),
    trim(reference_number)
  );
  return generated_number;
end;
$$;
grant execute on function public.submit_support_ticket(text,text,text,text,text,text) to anon, authenticated;

create or replace function public.reply_support_ticket(
  target_ticket_id uuid,
  reply_text text,
  close_ticket boolean default false
)
returns void language plpgsql security definer set search_path = public as $$
declare ticket public.support_tickets%rowtype;
declare recipient public.profiles%rowtype;
declare fallback_email text;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  if length(trim(reply_text)) < 2 then raise exception 'Reply is required'; end if;
  update public.support_tickets set staff_reply=trim(reply_text),replied_by=auth.uid(),
    replied_at=now(),status=case when close_ticket then 'closed' else 'in_progress' end,
    updated_at=now()
  where id=target_ticket_id returning * into ticket;
  if ticket.id is null then raise exception 'Ticket not found'; end if;
  if ticket.user_id is not null then select * into recipient from public.profiles where id=ticket.user_id; end if;
  fallback_email := coalesce(ticket.contact_snapshot->>'email','');
  perform public.queue_transactional_email(coalesce(recipient.email,fallback_email),'support_reply',
    jsonb_build_object('fullName',coalesce(recipient.full_name,ticket.contact_snapshot->>'name',''),
      'language',coalesce(recipient.preferred_language,'ru'),'number',ticket.ticket_number,
      'message',trim(reply_text),'actionUrl','/notifications'));
end;
$$;
grant execute on function public.reply_support_ticket(uuid,text,boolean) to authenticated;

create or replace function public.approve_order(target_order_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare plain_code text;
declare selected public.orders%rowtype;
declare customer public.profiles%rowtype;
begin
  if not public.is_staff() then raise exception 'Staff access required'; end if;
  plain_code := 'VZ-' || upper(substr(encode(gen_random_bytes(8),'hex'),1,4))
    || '-' || upper(substr(encode(gen_random_bytes(8),'hex'),1,4));
  update public.orders set
    activation_code_hash=encode(digest(plain_code,'sha256'),'hex'),
    activation_code_expires_at=now()+interval '7 days',reviewed_by=auth.uid(),
    reviewed_at=now(),status='payment_review',updated_at=now()
  where id=target_order_id and status in ('payment_pending','payment_review')
  returning * into selected;
  if selected.id is null then raise exception 'Order unavailable'; end if;
  select * into customer from public.profiles where id=selected.user_id;
  perform public.queue_transactional_email(customer.email,'payment_confirmed',
    jsonb_build_object('fullName',customer.full_name,'language',customer.preferred_language,
      'number',selected.order_number,'actionUrl','/payment'));
  perform public.queue_transactional_email(customer.email,'plan_activation',
    jsonb_build_object('fullName',customer.full_name,'language',customer.preferred_language,
      'number',selected.order_number,'planCode',selected.plan_code,'code',plain_code,'actionUrl','/payment'));
  return plain_code;
end;
$$;
grant execute on function public.approve_order(uuid) to authenticated;

create or replace function public.queue_expiring_plan_emails()
returns integer language plpgsql security definer set search_path = public as $$
declare queued integer := 0;
declare item record;
begin
  for item in
    select s.profile_id,s.expires_at,p.email,p.full_name,p.preferred_language
    from public.subscriptions s join public.profiles p on p.id=s.profile_id
    where s.expires_at::date in ((current_date+interval '7 days')::date,(current_date+interval '1 day')::date)
  loop
    perform public.queue_transactional_email(item.email,'plan_expiring',
      jsonb_build_object('fullName',item.full_name,'language',item.preferred_language,
        'expiresAt',to_char(item.expires_at,'DD.MM.YYYY'),'actionUrl','/payment'));
    queued := queued+1;
  end loop;
  return queued;
end;
$$;

do $$
begin
  if exists(select 1 from pg_available_extensions where name='pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    if not exists(select 1 from cron.job where jobname='vizora-plan-expiry-email') then
      perform cron.schedule('vizora-plan-expiry-email','15 3 * * *',
        'select public.queue_expiring_plan_emails()');
    end if;
  end if;
exception when others then
  raise notice 'pg_cron schedule skipped: %', sqlerrm;
end $$;
