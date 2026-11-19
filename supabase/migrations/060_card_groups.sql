-- Admin feature: several cards shown as one card with a switcher (one QR).
create table if not exists public.card_group_members (
  card_id uuid primary key references public.cards(id) on delete cascade,
  group_id uuid not null,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists card_group_members_group on public.card_group_members(group_id);
alter table public.card_group_members enable row level security;

create or replace function public.get_card_group(p_slug text)
returns table (slug text, full_name text, card_position text, photo_path text, sort int)
language sql stable security definer set search_path = public as $$
  select c.slug, c.full_name, c.position, c.photo_path, m.sort
  from public.cards me
  join public.card_group_members gm on gm.card_id = me.id
  join public.card_group_members m on m.group_id = gm.group_id
  join public.cards c on c.id = m.card_id
  where me.slug = p_slug
    and c.review_status = 'approved' and not c.pending_claim
    and c.visibility in ('public','public_organization')
  order by m.sort, c.created_at;
$$;
grant execute on function public.get_card_group(text) to anon, authenticated;

create or replace function public.admin_link_cards(p_slugs text[])
returns uuid language plpgsql security definer set search_path = public as $$
declare v_group uuid := gen_random_uuid(); v_id uuid; i int := 0; s text;
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  if coalesce(array_length(p_slugs,1),0) < 2 then raise exception 'need_two'; end if;
  foreach s in array p_slugs loop
    select id into v_id from public.cards where slug = lower(btrim(s));
    if v_id is null then raise exception 'card_not_found: %', s; end if;
    insert into public.card_group_members(card_id, group_id, sort) values (v_id, v_group, i)
      on conflict (card_id) do update set group_id = excluded.group_id, sort = excluded.sort;
    i := i + 1;
  end loop;
  delete from public.card_group_members g
   where not exists (select 1 from public.card_group_members o where o.group_id = g.group_id and o.card_id <> g.card_id);
  return v_group;
end; $$;
grant execute on function public.admin_link_cards(text[]) to authenticated;

create or replace function public.admin_unlink_group(p_group uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  delete from public.card_group_members where group_id = p_group;
end; $$;
grant execute on function public.admin_unlink_group(uuid) to authenticated;

create or replace function public.admin_list_card_groups()
returns table (group_id uuid, slug text, full_name text, card_position text, sort int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'forbidden'; end if;
  return query select m.group_id, c.slug, c.full_name, c.position, m.sort
    from public.card_group_members m join public.cards c on c.id = m.card_id
    order by m.group_id, m.sort;
end; $$;
grant execute on function public.admin_list_card_groups() to authenticated;

-- Link the two cards of Dodkhudo Sharifzoda (General Director first).
insert into public.card_group_members(card_id, group_id, sort)
select id, '7a7d0a54-1f2b-4c8e-9a51-3d6f0b2c9e11'::uuid, case slug when 'dodkhudo-sharifzoda' then 0 else 1 end
from public.cards where slug in ('dodkhudo-sharifzoda','dodkhudo-sharifzoda-2')
on conflict (card_id) do nothing;
