-- VIZORA.TJ: administrator moderation and security workspace.
-- Run after 011_admin_accounts.sql.

alter table public.reports
  add column if not exists resolution_note text not null default '',
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create index if not exists cards_review_queue_idx
  on public.cards(review_status, updated_at desc);
create index if not exists verification_review_queue_idx
  on public.verification_requests(status, created_at desc);
create index if not exists reports_review_queue_idx
  on public.reports(status, created_at desc);

drop policy if exists "admin read verification documents" on storage.objects;
create policy "admin read verification documents" on storage.objects
for select to authenticated
using (bucket_id='verification-documents' and public.is_platform_admin());

create or replace function public.get_admin_moderation_workspace()
returns jsonb language plpgsql stable security definer set search_path=public
as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;

  select jsonb_build_object(
    'stats',jsonb_build_object(
      'cards',(select count(*) from public.cards where review_status in ('pending','changes_requested','suspended')),
      'documents',(select count(*) from public.verification_requests where status in ('pending','changes_requested')),
      'reports',(select count(*) from public.reports where status in ('new','reviewing')),
      'riskSignals',(select count(*) from public.cards c where
        exists(select 1 from public.cards c2 where c2.id<>c.id and c2.owner_id<>c.owner_id
          and nullif(c.contacts->>'phone','') is not null
          and regexp_replace(coalesce(c2.contacts->>'phone',''),'[^0-9]','','g')=
              regexp_replace(coalesce(c.contacts->>'phone',''),'[^0-9]','','g'))
      )
    ),
    'cards',coalesce((select jsonb_agg(item) from (
      select jsonb_build_object(
        'id',c.id,'ownerId',c.owner_id,'name',c.full_name,'position',c.position,
        'organization',c.organization_name,'slug',c.slug,'status',c.review_status,
        'description',c.description,'phone',coalesce(c.contacts->>'phone',''),
        'email',coalesce(c.contacts->>'email',p.email,''),'updatedAt',c.updated_at,
        'riskSignals',
          (case when exists(select 1 from public.cards c2 where c2.id<>c.id and c2.owner_id<>c.owner_id
            and nullif(c.contacts->>'phone','') is not null
            and regexp_replace(coalesce(c2.contacts->>'phone',''),'[^0-9]','','g')=
                regexp_replace(coalesce(c.contacts->>'phone',''),'[^0-9]','','g'))
           then jsonb_build_array('Совпадение номера телефона') else '[]'::jsonb end)
      ) item from public.cards c join public.profiles p on p.id=c.owner_id
      where c.review_status in ('pending','changes_requested','suspended')
      order by c.updated_at desc limit 200
    ) q),'[]'::jsonb),
    'verifications',coalesce((select jsonb_agg(item) from (
      select jsonb_build_object(
        'id',v.id,'profileId',v.profile_id,'cardId',v.card_id,'name',p.full_name,
        'email',coalesce(p.email,''),'cardName',coalesce(c.full_name,''),
        'profession',coalesce(pc.name_ru,''),'requiresLicense',coalesce(pc.requires_license,false),
        'documentPaths',v.document_paths,'status',v.status,'note',v.reviewer_note,
        'createdAt',v.created_at
      ) item from public.verification_requests v
      join public.profiles p on p.id=v.profile_id
      left join public.cards c on c.id=v.card_id
      left join public.profession_categories pc on pc.id=c.profession_category_id
      where v.status in ('pending','changes_requested')
      order by v.created_at desc limit 200
    ) q),'[]'::jsonb),
    'reports',coalesce((select jsonb_agg(item) from (
      select jsonb_build_object(
        'id',r.id,'cardId',r.card_id,'cardName',c.full_name,'cardSlug',c.slug,
        'ownerId',c.owner_id,'reporter',coalesce(p.full_name,'Анонимно'),
        'reason',r.reason,'details',r.details,'status',r.status,'createdAt',r.created_at
      ) item from public.reports r
      join public.cards c on c.id=r.card_id
      left join public.profiles p on p.id=r.reporter_id
      where r.status in ('new','reviewing')
      order by r.created_at desc limit 200
    ) q),'[]'::jsonb),
    'audit',coalesce((select jsonb_agg(item) from (
      select jsonb_build_object(
        'id',a.id,'action',a.action,'details',a.details,'createdAt',a.created_at
      ) item from public.admin_audit_log a
      where a.action like 'moderation_%'
      order by a.created_at desc limit 100
    ) q),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_review_card(
  target_card_id uuid, decision public.review_status, note text default ''
)
returns void language plpgsql security definer set search_path=public
as $$
declare previous_status public.review_status;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if decision not in ('approved','changes_requested','rejected','suspended') then
    raise exception 'Invalid review decision';
  end if;
  select review_status into previous_status from public.cards where id=target_card_id for update;
  if previous_status is null then raise exception 'Card not found'; end if;

  update public.cards set review_status=decision,
    visibility=case when decision='approved' then 'public'::public.card_visibility else 'private'::public.card_visibility end,
    verified_at=case when decision='approved' then now() else verified_at end,
    published_at=case when decision='approved' then now() else published_at end,
    updated_at=now()
  where id=target_card_id;

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'moderation_card_decision',jsonb_build_object(
    'cardId',target_card_id,'from',previous_status,'to',decision,'note',trim(note)
  ));
end;
$$;

create or replace function public.admin_review_verification(
  target_request_id uuid, decision public.review_status, note text default ''
)
returns void language plpgsql security definer set search_path=public
as $$
declare request_row public.verification_requests%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if decision not in ('approved','changes_requested','rejected') then
    raise exception 'Invalid verification decision';
  end if;
  select * into request_row from public.verification_requests where id=target_request_id for update;
  if request_row.id is null then raise exception 'Verification request not found'; end if;

  update public.verification_requests set status=decision,reviewer_note=trim(note),
    reviewed_by=auth.uid(),reviewed_at=now() where id=target_request_id;
  if decision='approved' then
    update public.profiles set identity_verified_at=now(),updated_at=now()
    where id=request_row.profile_id;
    if request_row.card_id is not null then
      update public.cards set verified_at=now(),updated_at=now() where id=request_row.card_id;
    end if;
  end if;

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'moderation_verification_decision',jsonb_build_object(
    'requestId',target_request_id,'profileId',request_row.profile_id,
    'decision',decision,'note',trim(note)
  ));
end;
$$;

create or replace function public.admin_resolve_report(
  target_report_id uuid, action text, note text default ''
)
returns void language plpgsql security definer set search_path=public
as $$
declare report_row public.reports%rowtype;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if action not in ('dismiss','hide_card','restore_card') then raise exception 'Invalid report action'; end if;
  select * into report_row from public.reports where id=target_report_id for update;
  if report_row.id is null then raise exception 'Report not found'; end if;

  if action='hide_card' then
    update public.cards set review_status='suspended',visibility='private',updated_at=now()
    where id=report_row.card_id;
  elsif action='restore_card' then
    update public.cards set review_status='approved',visibility='public',updated_at=now()
    where id=report_row.card_id;
  end if;
  update public.reports set status='resolved',resolution_note=trim(note),
    reviewed_by=auth.uid(),reviewed_at=now() where id=target_report_id;

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'moderation_report_resolved',jsonb_build_object(
    'reportId',target_report_id,'cardId',report_row.card_id,'result',action,'note',trim(note)
  ));
end;
$$;

grant execute on function public.get_admin_moderation_workspace() to authenticated;
grant execute on function public.admin_review_card(uuid,public.review_status,text) to authenticated;
grant execute on function public.admin_review_verification(uuid,public.review_status,text) to authenticated;
grant execute on function public.admin_resolve_report(uuid,text,text) to authenticated;
