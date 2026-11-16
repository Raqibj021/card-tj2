-- The admin badge for "Заказы услуг" counts only orders nobody has opened yet (status = 'new').
-- Previously 'clarifying' was counted too, so a clarifying order kept the badge on forever.
create or replace function public.get_admin_nav_counts()
returns jsonb
language plpgsql
stable security definer
set search_path = public
as $$
declare
  accounts_count integer;
  cards_count integer;
  moderation_count integer;
  payments_count integer;
  services_count integer;
  support_count integer;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  select count(*) into accounts_count from public.organizations where review_status in ('pending','changes_requested');
  select count(*) into cards_count from public.cards where review_status='pending';
  select (select count(*) from public.verification_requests where status in ('pending','changes_requested'))+
    (select count(*) from public.reports where status in ('new','reviewing')) into moderation_count;
  select (select count(*) from public.orders where status in ('payment_pending','payment_review'))+
    (select count(*) from public.contracts where status='submitted') into payments_count;
  select count(*) into services_count from public.service_orders where status = 'new';
  select count(*) into support_count from public.support_tickets where status in ('new','open','in_progress');
  return jsonb_build_object(
    'accounts',accounts_count,'cards',cards_count,'moderation',moderation_count,
    'payments',payments_count,'services',services_count,'support',support_count,
    'total',accounts_count+cards_count+moderation_count+payments_count+services_count+support_count
  );
end;
$$;
