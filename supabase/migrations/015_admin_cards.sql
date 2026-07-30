-- VIZORA.TJ: complete administrator card registry with audited private access.
-- Run after 014_admin_support.sql.

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

create or replace function public.get_admin_cards_workspace()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;

  select jsonb_build_object(
    'stats', jsonb_build_object(
      'total',(select count(*) from public.cards),
      'public',(select count(*) from public.cards where visibility::text in ('public','public_organization')),
      'private',(select count(*) from public.cards where visibility::text not in ('public','public_organization')),
      'pending',(select count(*) from public.cards where review_status::text='pending'),
      'approved',(select count(*) from public.cards where review_status::text='approved'),
      'views',(select coalesce(sum(views),0) from public.cards)
    ),
    'cards', coalesce((select jsonb_agg(item) from (
      select jsonb_build_object(
        'id',c.id,'ownerId',c.owner_id,'ownerName',p.full_name,
        'ownerEmail',coalesce(p.email,''),'slug',c.slug,'fullName',c.full_name,
        'position',coalesce(c.position,''),'organization',coalesce(c.organization_name,''),
        'visibility',c.visibility,'reviewStatus',c.review_status,'language',c.language,
        'views',c.views,'photo',coalesce(c.photo_path,''),
        'contactsCount',(select count(*) from jsonb_each_text(coalesce(c.contacts,'{}'::jsonb)) x where nullif(trim(x.value),'') is not null),
        'createdAt',c.created_at,'updatedAt',c.updated_at
      ) item from public.cards c
      join public.profiles p on p.id=c.owner_id
      order by c.updated_at desc limit 500
    ) rows), '[]'::jsonb),
    'accessHistory', coalesce((select jsonb_agg(item) from (
      select jsonb_build_object(
        'id',l.id,'cardId',l.card_id,'cardName',c.full_name,'cardSlug',c.slug,
        'adminName',p.full_name,'adminEmail',coalesce(p.email,''),
        'reason',l.access_reason,'visibility',l.card_visibility,'accessedAt',l.accessed_at
      ) item from public.admin_card_access_log l
      join public.cards c on c.id=l.card_id
      join public.profiles p on p.id=l.admin_id
      order by l.accessed_at desc limit 100
    ) history), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_open_card_details(
  target_card_id uuid,
  access_reason text default 'administrative_review'
)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare result jsonb;
declare current_visibility text;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;

  select c.visibility::text into current_visibility
  from public.cards c where c.id=target_card_id;
  if current_visibility is null then raise exception 'Card not found'; end if;

  insert into public.admin_card_access_log(admin_id,card_id,access_reason,card_visibility)
  values(auth.uid(),target_card_id,left(coalesce(nullif(trim(access_reason),''),'administrative_review'),160),current_visibility);

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'card_private_data_opened',jsonb_build_object(
    'cardId',target_card_id,'visibility',current_visibility,
    'reason',left(coalesce(nullif(trim(access_reason),''),'administrative_review'),160)
  ));

  select jsonb_build_object(
    'id',c.id,'ownerId',c.owner_id,'ownerName',p.full_name,'ownerEmail',coalesce(p.email,''),
    'ownerPhone',coalesce(p.phone,''),'slug',c.slug,'fullName',c.full_name,
    'position',coalesce(c.position,''),'organization',coalesce(c.organization_name,''),
    'description',coalesce(c.description,''),'photo',coalesce(c.photo_path,''),
    'companyLogo',coalesce(c.contacts->>'companyLogo',''),'contacts',coalesce(c.contacts,'{}'::jsonb),
    'address',coalesce(c.address,''),'language',c.language,'theme',c.theme,'template',c.template,
    'visibility',c.visibility,'reviewStatus',c.review_status,'views',c.views,
    'verifiedAt',c.verified_at,'createdAt',c.created_at,'updatedAt',c.updated_at
  ) into result
  from public.cards c join public.profiles p on p.id=c.owner_id
  where c.id=target_card_id;
  return result;
end;
$$;

grant select on public.admin_card_access_log to authenticated;
grant execute on function public.get_admin_cards_workspace() to authenticated;
grant execute on function public.admin_open_card_details(uuid,text) to authenticated;

