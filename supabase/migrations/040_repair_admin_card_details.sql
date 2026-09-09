-- VIZORA.TJ: repair administrator card details on databases where migration 015
-- was not fully installed before the newer admin-card functions.

create table if not exists public.admin_card_access_log (
  id bigint generated always as identity primary key,
  admin_id uuid not null references public.profiles(id) on delete restrict,
  card_id uuid not null references public.cards(id) on delete cascade,
  access_reason text not null default 'administrative_review',
  card_visibility text not null,
  accessed_at timestamptz not null default now()
);

create index if not exists admin_card_access_log_card_idx
  on public.admin_card_access_log(card_id, accessed_at desc);
create index if not exists admin_card_access_log_admin_idx
  on public.admin_card_access_log(admin_id, accessed_at desc);

alter table public.admin_card_access_log enable row level security;
drop policy if exists "admins read card access log" on public.admin_card_access_log;
create policy "admins read card access log"
  on public.admin_card_access_log for select to authenticated
  using (public.is_platform_admin());

revoke all on table public.admin_card_access_log from public;
grant select on table public.admin_card_access_log to authenticated;
grant usage, select on sequence public.admin_card_access_log_id_seq to authenticated;

revoke all on function public.admin_open_card_details(uuid,text) from public;
grant execute on function public.admin_open_card_details(uuid,text) to authenticated;
revoke all on function public.admin_update_card(uuid,jsonb) from public;
grant execute on function public.admin_update_card(uuid,jsonb) to authenticated;

notify pgrst, 'reload schema';
