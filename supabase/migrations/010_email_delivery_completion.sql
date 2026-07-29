-- VIZORA.TJ: complete transactional email triggers and prevent duplicate reminders.
-- Run after 009_organization_structure.sql.

drop trigger if exists card_review_email on public.cards;

create or replace function public.queue_verification_result_email()
returns trigger language plpgsql security definer set search_path = public as $$
declare recipient public.profiles%rowtype;
declare template text;
begin
  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status
      and old.reviewer_note is not distinct from new.reviewer_note then
      return new;
    end if;
  end if;
  if new.status = 'changes_requested' then template := 'additional_documents';
  elsif new.status = 'suspended' then template := 'account_blocked';
  elsif new.status in ('approved','rejected') then template := 'verification_result';
  else return new;
  end if;
  select * into recipient from public.profiles where id = new.profile_id;
  perform public.queue_transactional_email(
    recipient.email,
    template,
    jsonb_build_object(
      'fullName',recipient.full_name,
      'language',recipient.preferred_language,
      'status',new.status,
      'note',coalesce(new.reviewer_note,''),
      'actionUrl','/dashboard'
    )
  );
  return new;
end;
$$;

drop trigger if exists verification_result_email on public.verification_requests;
create trigger verification_result_email
after insert or update of status, reviewer_note on public.verification_requests
for each row execute function public.queue_verification_result_email();

create or replace function public.queue_expiring_plan_emails()
returns integer language plpgsql security definer set search_path = public as $$
declare queued integer := 0;
declare item record;
begin
  for item in
    select s.profile_id,s.expires_at,p.email,p.full_name,p.preferred_language
    from public.subscriptions s join public.profiles p on p.id=s.profile_id
    where s.expires_at::date in (
      (current_date+interval '7 days')::date,
      (current_date+interval '1 day')::date
    )
    and not exists (
      select 1 from public.email_outbox e
      where e.recipient=lower(trim(p.email))
        and e.template_key='plan_expiring'
        and e.created_at::date=current_date
    )
  loop
    perform public.queue_transactional_email(
      item.email,
      'plan_expiring',
      jsonb_build_object(
        'fullName',item.full_name,
        'language',item.preferred_language,
        'expiresAt',to_char(item.expires_at,'DD.MM.YYYY'),
        'actionUrl','/payment'
      )
    );
    queued := queued+1;
  end loop;
  return queued;
end;
$$;

revoke all on function public.queue_expiring_plan_emails() from public, anon, authenticated;
grant execute on function public.queue_expiring_plan_emails() to service_role;
