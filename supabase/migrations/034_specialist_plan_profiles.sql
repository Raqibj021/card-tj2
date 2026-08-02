-- Distinct Verified Specialist and Specialist PRO profile capabilities.
-- Run after migration 033.

alter table public.cards
  add column if not exists specialist_plan text not null default 'specialist',
  add column if not exists specialist_service_area text not null default '',
  add column if not exists specialist_consultation text not null default '',
  add column if not exists specialist_portfolio text[] not null default '{}';

alter table public.cards drop constraint if exists cards_specialist_plan_valid;
alter table public.cards add constraint cards_specialist_plan_valid
  check (specialist_plan in ('specialist', 'pro'));
alter table public.cards drop constraint if exists cards_specialist_portfolio_limit;
alter table public.cards add constraint cards_specialist_portfolio_limit
  check (cardinality(specialist_portfolio) <= 20);

create index if not exists cards_specialist_plan_idx
  on public.cards(specialist_plan, directory_featured_until desc, published_at desc)
  where review_status = 'approved' and directory_hidden = false and directory_removed_at is null;

-- Keep the permanent removal action complete after adding plan-specific data.
create or replace function public.set_specialist_directory_visibility(target_card_id uuid, requested_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare target public.cards%rowtype;
begin
  select * into target from public.cards where id = target_card_id and owner_id = auth.uid() for update;
  if target.id is null then raise exception 'Визитка не найдена.'; end if;
  if requested_action = 'hide' then
    update public.cards set directory_hidden = true, updated_at = now() where id = target.id;
  elsif requested_action = 'show' then
    if target.directory_removed_at is not null then raise exception 'Профиль удалён из каталога навсегда.'; end if;
    update public.cards set directory_hidden = false, updated_at = now() where id = target.id;
  elsif requested_action = 'remove' then
    update public.cards set directory_hidden = true, directory_removed_at = now(), directory_featured_until = null,
      profession_category_id = null, specialist_title = '', specialist_city = '', specialist_tags = '{}',
      specialist_experience = '', specialist_summary = '', specialist_plan = 'specialist',
      specialist_service_area = '', specialist_consultation = '', specialist_portfolio = '{}', updated_at = now()
    where id = target.id;
  else raise exception 'Неизвестное действие.';
  end if;
  return jsonb_build_object('ok', true, 'action', requested_action);
end $$;

revoke all on function public.set_specialist_directory_visibility(uuid,text) from public;
grant execute on function public.set_specialist_directory_visibility(uuid,text) to authenticated;
