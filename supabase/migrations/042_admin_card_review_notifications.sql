-- VIZORA.TJ: notify platform administrators when a personal card is sent for review.
-- Run after 041_admin_service_order_notifications.sql.
-- Based on the latest request_card_review (023); only adds the admin notification step.

create or replace function public.request_card_review(target_card_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare
  card_name text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists(select 1 from public.cards where id=target_card_id and owner_id=auth.uid())
    then raise exception 'Card not found'; end if;
  if not exists(select 1 from public.subscriptions where profile_id=auth.uid() and expires_at>now())
    and not exists(
      select 1 from public.organization_members m
      join public.organizations o on o.id=m.organization_id
      where m.profile_id=auth.uid() and o.active_until>now()
    )
    then raise exception 'Choose the launch offer or pay for a tariff first'; end if;
  if exists(
    select 1 from public.cards c join public.profession_categories p on p.id=c.profession_category_id
    where c.id=target_card_id and p.requires_license and not exists(
      select 1 from public.verification_requests v
      where v.card_id=c.id and cardinality(v.document_paths)>0
    )
  ) then raise exception 'Verification documents required'; end if;

  update public.cards set review_status='pending',visibility='private',
    trial_expires_at=null,updated_at=now()
  where id=target_card_id and owner_id=auth.uid()
  returning full_name into card_name;

  -- Every platform administrator gets an in-app notification for the review queue.
  insert into public.notifications(user_id,kind,title,body,action_url)
  select admins.id,'admin_card_review','Новая визитка на проверку',
    coalesce(nullif(trim(coalesce(card_name,'')),''),'Визитка')||' ждёт одобрения.',
    '/admin/cards'
  from public.profiles admins
  where admins.role='admin';
end;
$$;

grant execute on function public.request_card_review(uuid) to authenticated;
