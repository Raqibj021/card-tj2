-- Stage 5: standalone administrator support, email monitoring and consent-based campaigns.
alter table public.support_tickets add column if not exists priority text not null default 'normal';
alter table public.support_tickets add column if not exists internal_note text not null default '';
alter table public.support_tickets add column if not exists first_response_at timestamptz;
alter table public.support_tickets add column if not exists closed_at timestamptz;

do $$ begin
  alter table public.support_tickets add constraint support_tickets_priority_check
    check (priority in ('low','normal','high','urgent'));
exception when duplicate_object then null; end $$;

create table if not exists public.admin_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  message text not null,
  audience text not null default 'marketing',
  language text not null default 'all',
  status text not null default 'queued',
  recipient_count integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  queued_at timestamptz,
  constraint admin_campaigns_audience_check check (audience in ('marketing','active','organizations')),
  constraint admin_campaigns_language_check check (language in ('all','ru','tj','en')),
  constraint admin_campaigns_status_check check (status in ('draft','queued','sent','cancelled'))
);
alter table public.admin_campaigns enable row level security;
drop policy if exists "platform admins manage campaigns" on public.admin_campaigns;
create policy "platform admins manage campaigns" on public.admin_campaigns for all
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create index if not exists support_tickets_admin_queue_idx on public.support_tickets(status,priority,created_at desc);
create index if not exists email_outbox_admin_queue_idx on public.email_outbox(status,created_at desc);

create or replace function public.get_admin_support_workspace()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.is_platform_admin() then raise exception 'Admin access required'; end if;
  return jsonb_build_object(
    'stats',jsonb_build_object(
      'newTickets',(select count(*) from support_tickets where status in ('new','open')),
      'inProgress',(select count(*) from support_tickets where status='in_progress'),
      'closedTickets',(select count(*) from support_tickets where status in ('closed','resolved')),
      'urgentTickets',(select count(*) from support_tickets where priority='urgent' and status not in ('closed','resolved')),
      'unresolvedReports',(select count(*) from reports where status in ('new','open','reviewing')),
      'queuedEmails',(select count(*) from email_outbox where status in ('queued','sending')),
      'failedEmails',(select count(*) from email_outbox where status='failed'),
      'sentToday',(select count(*) from email_outbox where status='sent' and sent_at>=date_trunc('day',now())),
      'marketingAudience',(select count(*) from profiles where marketing_consent is true and nullif(email,'') is not null)
    ),
    'tickets',coalesce((select jsonb_agg(jsonb_build_object(
      'id',t.id,'ticketNumber',t.ticket_number,'category',t.category,'subject',t.subject,'message',t.message,
      'status',t.status,'priority',t.priority,'staffReply',coalesce(t.staff_reply,''),'internalNote',coalesce(t.internal_note,''),
      'createdAt',t.created_at,'updatedAt',t.updated_at,'firstResponseAt',t.first_response_at,'closedAt',t.closed_at,
      'contact',coalesce(t.contact_snapshot,'{}'::jsonb)
    ) order by case when t.priority='urgent' then 0 when t.priority='high' then 1 else 2 end,t.created_at desc) from support_tickets t),'[]'::jsonb),
    'outbox',coalesce((select jsonb_agg(jsonb_build_object(
      'id',e.id,'recipient',e.recipient,'template',e.template_key,'subject',coalesce(e.subject,''),
      'status',e.status,'attempts',e.attempts,'lastError',coalesce(e.last_error,''),
      'scheduledAt',e.scheduled_at,'sentAt',e.sent_at,'createdAt',e.created_at
    ) order by e.created_at desc) from (select * from email_outbox order by created_at desc limit 150) e),'[]'::jsonb),
    'campaigns',coalesce((select jsonb_agg(jsonb_build_object(
      'id',c.id,'title',c.title,'subject',c.subject,'message',c.message,'audience',c.audience,
      'language',c.language,'status',c.status,'recipientCount',c.recipient_count,'createdAt',c.created_at
    ) order by c.created_at desc) from (select * from admin_campaigns order by created_at desc limit 50) c),'[]'::jsonb),
    'history',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'action',a.action,'details',a.details,'createdAt',a.created_at) order by a.created_at desc)
      from (select * from admin_audit_log where action like 'support_%' or action like 'email_%' or action like 'campaign_%' order by created_at desc limit 100) a),'[]'::jsonb)
  );
end $$;

create or replace function public.admin_reply_support_ticket(
  target_ticket_id uuid, reply_text text, next_status text, next_priority text, internal_note_text text
) returns void language plpgsql security definer set search_path=public as $$
declare ticket support_tickets%rowtype; recipient text;
begin
  if not public.is_platform_admin() then raise exception 'Admin access required'; end if;
  if next_status not in ('new','open','in_progress','resolved','closed') then raise exception 'Invalid status'; end if;
  if next_priority not in ('low','normal','high','urgent') then raise exception 'Invalid priority'; end if;
  if length(coalesce(reply_text,''))>6000 or length(coalesce(internal_note_text,''))>6000 then raise exception 'Text is too long'; end if;
  update support_tickets set
    staff_reply=case when nullif(trim(reply_text),'') is null then staff_reply else trim(reply_text) end,
    replied_by=case when nullif(trim(reply_text),'') is null then replied_by else auth.uid() end,
    replied_at=case when nullif(trim(reply_text),'') is null then replied_at else now() end,
    first_response_at=case when nullif(trim(reply_text),'') is null then first_response_at else coalesce(first_response_at,now()) end,
    status=next_status,priority=next_priority,internal_note=trim(coalesce(internal_note_text,'')),
    closed_at=case when next_status in ('closed','resolved') then coalesce(closed_at,now()) else null end,updated_at=now()
  where id=target_ticket_id returning * into ticket;
  if not found then raise exception 'Ticket not found'; end if;
  recipient=coalesce((select email from profiles where id=ticket.user_id),ticket.contact_snapshot->>'email');
  if nullif(trim(reply_text),'') is not null and nullif(recipient,'') is not null then
    perform public.queue_transactional_email(recipient,'support_reply',
      jsonb_build_object('number',ticket.ticket_number,'message',trim(reply_text),'actionUrl','/dashboard'),'Ответ поддержки Vizora',now());
  end if;
  insert into admin_audit_log(admin_id,action,details) values(auth.uid(),'support_ticket_updated',
    jsonb_build_object('ticketId',target_ticket_id,'ticketNumber',ticket.ticket_number,'status',next_status,'priority',next_priority,'replyQueued',nullif(recipient,'') is not null and nullif(trim(reply_text),'') is not null));
end $$;

create or replace function public.admin_retry_email(target_email_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare address text;
begin
  if not public.is_platform_admin() then raise exception 'Admin access required'; end if;
  update email_outbox set status='queued',attempts=0,last_error=null,locked_at=null,next_attempt_at=now(),scheduled_at=now()
    where id=target_email_id and status in ('failed','cancelled') returning recipient into address;
  if not found then raise exception 'Email cannot be retried'; end if;
  insert into admin_audit_log(admin_id,action,details) values(auth.uid(),'email_retried',jsonb_build_object('emailId',target_email_id,'recipient',address));
end $$;

create or replace function public.admin_cancel_email(target_email_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare address text;
begin
  if not public.is_platform_admin() then raise exception 'Admin access required'; end if;
  update email_outbox set status='cancelled',locked_at=null where id=target_email_id and status in ('queued','failed') returning recipient into address;
  if not found then raise exception 'Email cannot be cancelled'; end if;
  insert into admin_audit_log(admin_id,action,details) values(auth.uid(),'email_cancelled',jsonb_build_object('emailId',target_email_id,'recipient',address));
end $$;

create or replace function public.admin_send_campaign(
  campaign_title text,campaign_subject text,campaign_message text,campaign_audience text,campaign_language text
) returns integer language plpgsql security definer set search_path=public as $$
declare person record; total integer:=0; campaign_id uuid;
begin
  if not public.is_platform_admin() then raise exception 'Admin access required'; end if;
  if campaign_audience not in ('marketing','active','organizations') then raise exception 'Invalid audience'; end if;
  if campaign_language not in ('all','ru','tj','en') then raise exception 'Invalid language'; end if;
  if length(trim(campaign_title))<3 or length(trim(campaign_subject))<3 or length(trim(campaign_message))<10 then raise exception 'Campaign fields are too short'; end if;
  if length(campaign_message)>8000 then raise exception 'Message is too long'; end if;
  insert into admin_campaigns(title,subject,message,audience,language,status,created_by,queued_at)
    values(trim(campaign_title),trim(campaign_subject),trim(campaign_message),campaign_audience,campaign_language,'queued',auth.uid(),now()) returning id into campaign_id;
  for person in
    select distinct p.id,p.email,p.full_name,coalesce(p.preferred_language,'ru') lang
    from profiles p
    where p.marketing_consent is true and nullif(p.email,'') is not null
      and (campaign_language='all' or coalesce(p.preferred_language,'ru')=campaign_language)
      and (campaign_audience='marketing'
        or (campaign_audience='active' and exists(select 1 from subscriptions s where s.user_id=p.id and s.status='active'))
        or (campaign_audience='organizations' and exists(select 1 from organizations o where o.owner_id=p.id)))
  loop
    perform public.queue_transactional_email(person.email,'news_campaign',
      jsonb_build_object('fullName',person.full_name,'language',person.lang,'title',trim(campaign_title),'message',trim(campaign_message),'actionUrl','/'),'Vizora.tj — '||trim(campaign_subject),now());
    total:=total+1;
  end loop;
  update admin_campaigns set recipient_count=total,status=case when total>0 then 'queued' else 'cancelled' end where id=campaign_id;
  insert into admin_audit_log(admin_id,action,details) values(auth.uid(),'campaign_queued',
    jsonb_build_object('campaignId',campaign_id,'title',trim(campaign_title),'audience',campaign_audience,'recipients',total));
  return total;
end $$;

revoke all on function public.get_admin_support_workspace() from public,anon;
revoke all on function public.admin_reply_support_ticket(uuid,text,text,text,text) from public,anon;
revoke all on function public.admin_retry_email(uuid) from public,anon;
revoke all on function public.admin_cancel_email(uuid) from public,anon;
revoke all on function public.admin_send_campaign(text,text,text,text,text) from public,anon;
grant execute on function public.get_admin_support_workspace() to authenticated;
grant execute on function public.admin_reply_support_ticket(uuid,text,text,text,text) to authenticated;
grant execute on function public.admin_retry_email(uuid) to authenticated;
grant execute on function public.admin_cancel_email(uuid) to authenticated;
grant execute on function public.admin_send_campaign(text,text,text,text,text) to authenticated;
