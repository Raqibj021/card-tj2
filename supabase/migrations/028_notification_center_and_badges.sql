-- VIZORA.TJ: reliable, section-aware notifications and administrator counters.
-- Run after 027_fix_payment_approval.sql.

create or replace function public.admin_reject_payment(target_order_id uuid, reason text)
returns void
language plpgsql security definer set search_path=public,auth
as $$
declare selected public.orders%rowtype; customer public.profiles%rowtype; email_error text;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if length(trim(coalesce(reason,''))) < 3 then raise exception 'Rejection reason is required'; end if;
  update public.orders set status='rejected',rejection_reason=trim(reason),activation_code_hash=null,
    activation_code_expires_at=null,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now()
  where id=target_order_id and status in ('payment_pending','payment_review') returning * into selected;
  if selected.id is null then raise exception 'Order is not awaiting review'; end if;

  insert into public.notifications(user_id,kind,title,body,action_url)
  values(selected.user_id,'payment_rejected','Оплата не подтверждена',trim(reason),
    case when selected.organization_id is not null then '/organization/apply' else '/payment' end);

  select * into customer from public.profiles where id=selected.user_id;
  begin
    if nullif(trim(coalesce(customer.email,'')),'') is not null then
      perform public.queue_transactional_email(customer.email,'payment_rejected',jsonb_build_object(
        'fullName',customer.full_name,'language',customer.preferred_language,'number',selected.order_number,
        'reason',trim(reason),'actionUrl',case when selected.organization_id is not null then '/organization/apply' else '/payment' end));
    end if;
  exception when others then
    email_error:=sqlerrm;
    insert into public.admin_audit_log(admin_id,action,details) values(auth.uid(),'payment_email_queue_failed',
      jsonb_build_object('orderId',selected.id,'number',selected.order_number,'error',email_error));
  end;
  insert into public.admin_audit_log(admin_id,action,details) values(auth.uid(),'payment_rejected',
    jsonb_build_object('orderId',selected.id,'number',selected.order_number,'reason',trim(reason)));
end;
$$;

create or replace function public.admin_review_card(target_card_id uuid, decision public.review_status, note text default '')
returns void language plpgsql security definer set search_path=public,auth
as $$
declare target public.cards%rowtype; has_entitlement boolean:=false; notification_kind text;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if decision not in ('approved','changes_requested','rejected','suspended') then raise exception 'Invalid review decision'; end if;
  if decision in ('changes_requested','rejected','suspended') and length(trim(coalesce(note,'')))<3 then raise exception 'Review reason is required'; end if;
  select * into target from public.cards where id=target_card_id for update;
  if target.id is null then raise exception 'Card not found'; end if;
  if decision='approved' then
    has_entitlement:=exists(select 1 from public.subscriptions s where s.profile_id=target.owner_id and s.expires_at>now())
      or exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id
        where m.profile_id=target.owner_id and o.active_until>now());
    if not has_entitlement then raise exception 'Cannot approve: payment or launch offer is not active'; end if;
    if exists(select 1 from public.profession_categories p where p.id=target.profession_category_id and p.requires_license
      and not exists(select 1 from public.verification_requests v where v.card_id=target.id and v.status='approved'))
    then raise exception 'Cannot approve: professional documents are not verified'; end if;
  end if;
  update public.cards set review_status=decision,
    visibility=case when decision='approved' then case when exists(select 1 from public.organization_members where profile_id=target.owner_id)
      then 'public_organization'::public.card_visibility else 'public'::public.card_visibility end else 'private'::public.card_visibility end,
    verified_at=case when decision='approved' then now() else verified_at end,
    published_at=case when decision='approved' then now() else published_at end,trial_expires_at=null,updated_at=now()
  where id=target_card_id;
  notification_kind:=case decision when 'approved' then 'card_approved' when 'changes_requested' then 'card_changes_requested'
    when 'rejected' then 'card_rejected' else 'card_suspended' end;
  insert into public.notifications(user_id,kind,title,body,action_url) values(target.owner_id,notification_kind,
    case decision when 'approved' then 'Визитка одобрена' when 'changes_requested' then 'Нужно исправить визитку'
      when 'rejected' then 'Визитка отклонена' else 'Визитка приостановлена' end,
    case when decision='approved' then 'Визитка успешно одобрена. QR-код и публичная ссылка активированы.'
      else trim(note) end,'/dashboard');
  insert into public.admin_audit_log(admin_id,action,details) values(auth.uid(),'moderation_card_decision',
    jsonb_build_object('cardId',target_card_id,'from',target.review_status,'to',decision,'note',trim(note)));
end;
$$;

create or replace function public.admin_review_verification(target_request_id uuid, decision public.review_status, note text default '')
returns void language plpgsql security definer set search_path=public,auth
as $$
declare request_row public.verification_requests%rowtype; clean_note text:=trim(coalesce(note,''));
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if decision not in ('approved','changes_requested','rejected') then raise exception 'Invalid verification decision'; end if;
  if decision<>'approved' and length(clean_note)<3 then raise exception 'Review reason is required'; end if;
  select * into request_row from public.verification_requests where id=target_request_id for update;
  if request_row.id is null then raise exception 'Verification request not found'; end if;
  update public.verification_requests set status=decision,reviewer_note=clean_note,reviewed_by=auth.uid(),reviewed_at=now() where id=target_request_id;
  if decision='approved' then
    update public.profiles set identity_verified_at=now(),updated_at=now() where id=request_row.profile_id;
    if request_row.card_id is not null then update public.cards set verified_at=now(),updated_at=now() where id=request_row.card_id; end if;
  end if;
  insert into public.notifications(user_id,kind,title,body,action_url) values(request_row.profile_id,
    case decision when 'approved' then 'verification_approved' when 'changes_requested' then 'verification_changes_requested' else 'verification_rejected' end,
    case decision when 'approved' then 'Документы подтверждены' when 'changes_requested' then 'Нужны дополнительные документы' else 'Документы отклонены' end,
    case when decision='approved' then 'Проверка специалиста успешно завершена.' else clean_note end,'/verification');
  insert into public.admin_audit_log(admin_id,action,details) values(auth.uid(),'moderation_verification_decision',
    jsonb_build_object('requestId',target_request_id,'profileId',request_row.profile_id,'decision',decision,'note',clean_note));
end;
$$;

create or replace function public.queue_commerce_notification()
returns trigger language plpgsql security definer set search_path=public
as $$
declare v_title text; v_body text; v_email text; v_action text; v_kind text;
begin
  if tg_table_name='service_orders' then
    v_title:=case when tg_op='INSERT' then 'Заказ принят' else 'Статус заказа изменён' end;
    v_body:='Заказ '||new.order_number||': '||new.status||'.'; v_kind:='service_order'; v_action:='/dashboard/orders';
  else
    v_title:=case when tg_op='INSERT' then 'Договор создан' else 'Статус договора изменён' end;
    v_body:='Договор '||new.contract_number||': '||new.status||'.'; v_kind:='contract_status'; v_action:='/dashboard/orders';
  end if;
  insert into public.notifications(user_id,kind,title,body,action_url) values(new.user_id,v_kind,v_title,v_body,v_action);
  select email into v_email from public.profiles where id=new.user_id;
  if coalesce(v_email,'')<>'' then insert into public.email_outbox(recipient,template_key,payload)
    values(v_email,case when tg_table_name='service_orders' then 'service_order_status' else 'contract_status' end,
      jsonb_build_object('title',v_title,'message',v_body,'recordId',new.id,'actionUrl',v_action)); end if;
  return new;
end;
$$;

create or replace function public.admin_reply_support_ticket(target_ticket_id uuid, reply_text text, next_status text, next_priority text, internal_note_text text)
returns void language plpgsql security definer set search_path=public,auth
as $$
declare ticket public.support_tickets%rowtype; recipient text;
begin
  if not public.is_platform_admin() then raise exception 'Admin access required'; end if;
  if next_status not in ('new','open','in_progress','resolved','closed') then raise exception 'Invalid status'; end if;
  if next_priority not in ('low','normal','high','urgent') then raise exception 'Invalid priority'; end if;
  if length(coalesce(reply_text,''))>6000 or length(coalesce(internal_note_text,''))>6000 then raise exception 'Text is too long'; end if;
  update public.support_tickets set staff_reply=case when nullif(trim(reply_text),'') is null then staff_reply else trim(reply_text) end,
    replied_by=case when nullif(trim(reply_text),'') is null then replied_by else auth.uid() end,
    replied_at=case when nullif(trim(reply_text),'') is null then replied_at else now() end,
    first_response_at=case when nullif(trim(reply_text),'') is null then first_response_at else coalesce(first_response_at,now()) end,
    status=next_status,priority=next_priority,internal_note=trim(coalesce(internal_note_text,'')),
    closed_at=case when next_status in ('closed','resolved') then coalesce(closed_at,now()) else null end,updated_at=now()
  where id=target_ticket_id returning * into ticket;
  if not found then raise exception 'Ticket not found'; end if;
  recipient=coalesce((select email from public.profiles where id=ticket.user_id),ticket.contact_snapshot->>'email');
  if ticket.user_id is not null and nullif(trim(reply_text),'') is not null then
    insert into public.notifications(user_id,kind,title,body,action_url) values(ticket.user_id,'support_reply',
      'Ответ службы поддержки',trim(reply_text),'/notifications?section=support');
  end if;
  if nullif(trim(reply_text),'') is not null and nullif(recipient,'') is not null then
    perform public.queue_transactional_email(recipient,'support_reply',jsonb_build_object('number',ticket.ticket_number,
      'message',trim(reply_text),'actionUrl','/notifications?section=support'),'Ответ поддержки Vizora',now());
  end if;
  insert into public.admin_audit_log(admin_id,action,details) values(auth.uid(),'support_ticket_updated',
    jsonb_build_object('ticketId',target_ticket_id,'ticketNumber',ticket.ticket_number,'status',next_status,'priority',next_priority));
end;
$$;

create or replace function public.get_admin_nav_counts()
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare accounts_count integer; cards_count integer; moderation_count integer; payments_count integer; support_count integer;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  select count(*) into accounts_count from public.organizations where review_status in ('pending','changes_requested');
  select count(*) into cards_count from public.cards where review_status='pending';
  select (select count(*) from public.verification_requests where status in ('pending','changes_requested'))+
    (select count(*) from public.reports where status in ('new','reviewing')) into moderation_count;
  select (select count(*) from public.orders where status in ('payment_pending','payment_review'))+
    (select count(*) from public.service_orders where status in ('new','clarifying'))+
    (select count(*) from public.contracts where status='submitted') into payments_count;
  select count(*) into support_count from public.support_tickets where status in ('new','open','in_progress');
  return jsonb_build_object('accounts',accounts_count,'cards',cards_count,'moderation',moderation_count,
    'payments',payments_count,'support',support_count,'total',accounts_count+cards_count+moderation_count+payments_count+support_count);
end;
$$;

revoke all on function public.get_admin_nav_counts() from public;
grant execute on function public.get_admin_nav_counts() to authenticated;
grant execute on function public.admin_reject_payment(uuid,text) to authenticated;
grant execute on function public.admin_review_card(uuid,public.review_status,text) to authenticated;
grant execute on function public.admin_review_verification(uuid,public.review_status,text) to authenticated;
grant execute on function public.admin_reply_support_ticket(uuid,text,text,text,text) to authenticated;

-- Restore the missing in-app result for payments that were rejected before this fix.
-- The NOT EXISTS guard makes the migration safe to run more than once.
insert into public.notifications(user_id,kind,title,body,action_url,created_at)
select o.user_id,'payment_rejected','Оплата не подтверждена',
  coalesce(nullif(trim(o.rejection_reason),''),'Оплата не подтверждена. Проверьте данные и загрузите корректный чек.'),
  case when o.organization_id is not null then '/organization/apply' else '/payment' end,
  coalesce(o.reviewed_at,o.updated_at,o.created_at,now())
from public.orders o
where o.status='rejected'
  and not exists (
    select 1 from public.notifications n
    where n.user_id=o.user_id
      and n.kind='payment_rejected'
      and n.created_at between coalesce(o.reviewed_at,o.updated_at,o.created_at,now())-interval '2 minutes'
        and coalesce(o.reviewed_at,o.updated_at,o.created_at,now())+interval '2 minutes'
  );
