-- Visibility, permanent directory removal and time-limited TOP placement.
-- Run after migration 032.

alter table public.cards
  add column if not exists directory_hidden boolean not null default false,
  add column if not exists directory_removed_at timestamptz,
  add column if not exists directory_featured_until timestamptz;

create index if not exists cards_directory_public_order_idx
  on public.cards(directory_featured_until desc, published_at desc)
  where review_status = 'approved'
    and visibility in ('public', 'public_organization')
    and directory_hidden = false
    and directory_removed_at is null;

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
    update public.cards set
      directory_hidden = true, directory_removed_at = now(), directory_featured_until = null,
      profession_category_id = null, specialist_title = '', specialist_city = '', specialist_tags = '{}',
      specialist_experience = '', specialist_summary = '', updated_at = now()
    where id = target.id;
  else
    raise exception 'Неизвестное действие.';
  end if;
  return jsonb_build_object('ok', true, 'action', requested_action);
end $$;

revoke all on function public.set_specialist_directory_visibility(uuid,text) from public;
grant execute on function public.set_specialist_directory_visibility(uuid,text) to authenticated;

create or replace function public.sync_specialist_top_period()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.plan_code = 'pro' and new.expires_at > now() then
    update public.cards set directory_featured_until = new.expires_at, updated_at = now()
    where owner_id = new.profile_id and directory_removed_at is null;
  elsif old.plan_code = 'pro' and new.plan_code <> 'pro' then
    update public.cards set directory_featured_until = null, updated_at = now()
    where owner_id = new.profile_id;
  end if;
  return new;
end $$;

drop trigger if exists sync_specialist_top_period_trigger on public.subscriptions;
create trigger sync_specialist_top_period_trigger
after insert or update of plan_code, expires_at on public.subscriptions
for each row execute function public.sync_specialist_top_period();

-- Old public cards were not explicitly submitted through the new specialist form.
-- They remain ordinary business cards and must not populate the directory.
update public.cards set directory_hidden = true
where profession_category_id is not null
  and specialist_summary = ''
  and cardinality(specialist_tags) = 0;

