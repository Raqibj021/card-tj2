-- VIZORA.TJ: secure administrator editing for every digital card.
-- Run after 038_unified_card_payment_review.sql.

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
    'verifiedAt',c.verified_at,'createdAt',c.created_at,'updatedAt',c.updated_at,
    'professionCategoryId',coalesce(c.profession_category_id::text,''),
    'specialistTitle',coalesce(c.specialist_title,''),'specialistCity',coalesce(c.specialist_city,''),
    'specialistTags',to_jsonb(coalesce(c.specialist_tags,'{}'::text[])),
    'specialistExperience',coalesce(c.specialist_experience,''),
    'specialistSummary',coalesce(c.specialist_summary,''),'specialistPlan',c.specialist_plan,
    'specialistServiceArea',coalesce(c.specialist_service_area,''),
    'specialistConsultation',coalesce(c.specialist_consultation,''),
    'specialistPortfolio',to_jsonb(coalesce(c.specialist_portfolio,'{}'::text[]))
  ) into result
  from public.cards c join public.profiles p on p.id=c.owner_id
  where c.id=target_card_id;
  return result;
end;
$$;

create or replace function public.admin_update_card(target_card_id uuid, changes jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare target public.cards%rowtype;
declare before_data jsonb;
declare after_data jsonb;
declare clean_slug text;
declare clean_contacts jsonb;
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if jsonb_typeof(changes) <> 'object' then raise exception 'Invalid card changes'; end if;

  select * into target from public.cards where id=target_card_id for update;
  if target.id is null then raise exception 'Card not found'; end if;

  clean_slug := lower(trim(coalesce(changes->>'slug',target.slug)));
  if clean_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(clean_slug) not between 3 and 80 then
    raise exception 'Адрес визитки должен содержать 3–80 латинских букв, цифр или дефисов';
  end if;
  if exists(select 1 from public.cards where slug=clean_slug and id<>target_card_id) then
    raise exception 'Этот адрес визитки уже занят';
  end if;

  clean_contacts := case when jsonb_typeof(changes->'contacts')='object'
    then changes->'contacts' else target.contacts end;
  clean_contacts := jsonb_set(coalesce(clean_contacts,'{}'::jsonb),'{companyLogo}',
    to_jsonb(left(trim(coalesce(changes->>'companyLogo',target.contacts->>'companyLogo','')),2048)),true);

  before_data := jsonb_build_object(
    'slug',target.slug,'fullName',target.full_name,'position',target.position,
    'organization',target.organization_name,'description',target.description,
    'photo',target.photo_path,'contacts',target.contacts,'address',target.address,
    'language',target.language,'theme',target.theme,'template',target.template,
    'specialistTitle',target.specialist_title,'specialistCity',target.specialist_city,
    'specialistTags',target.specialist_tags,'specialistExperience',target.specialist_experience,
    'specialistSummary',target.specialist_summary,'specialistServiceArea',target.specialist_service_area,
    'specialistConsultation',target.specialist_consultation,'specialistPortfolio',target.specialist_portfolio
  );

  update public.cards set
    slug=clean_slug,
    full_name=left(trim(coalesce(changes->>'fullName',full_name)),160),
    position=left(trim(coalesce(changes->>'position',position)),160),
    organization_name=left(trim(coalesce(changes->>'organization',organization_name)),200),
    description=left(trim(coalesce(changes->>'description',description)),2000),
    photo_path=nullif(left(trim(coalesce(changes->>'photo',photo_path,'')),4096),''),
    contacts=clean_contacts,
    address=left(trim(coalesce(changes->>'address',address)),500),
    language=case when changes->>'language' in ('ru','tj','en') then changes->>'language' else language end,
    theme=case when changes->>'theme' in ('teal','blue','plum','amber','graphite','navy','violet','burgundy') then changes->>'theme' else theme end,
    template=case when changes->>'template' in ('executive','minimal','creative') then changes->>'template' else template end,
    specialist_title=left(trim(coalesce(changes->>'specialistTitle',specialist_title)),100),
    specialist_city=left(trim(coalesce(changes->>'specialistCity',specialist_city)),80),
    specialist_tags=case when jsonb_typeof(changes->'specialistTags')='array' then
      array(select left(trim(value),60) from jsonb_array_elements_text(changes->'specialistTags') value where trim(value)<>'' limit 12)
      else specialist_tags end,
    specialist_experience=left(trim(coalesce(changes->>'specialistExperience',specialist_experience)),80),
    specialist_summary=left(trim(coalesce(changes->>'specialistSummary',specialist_summary)),500),
    specialist_service_area=left(trim(coalesce(changes->>'specialistServiceArea',specialist_service_area)),140),
    specialist_consultation=left(trim(coalesce(changes->>'specialistConsultation',specialist_consultation)),140),
    specialist_portfolio=case when jsonb_typeof(changes->'specialistPortfolio')='array' then
      array(select left(trim(value),2048) from jsonb_array_elements_text(changes->'specialistPortfolio') value where trim(value)<>'' limit 20)
      else specialist_portfolio end,
    updated_at=now()
  where id=target_card_id;

  select jsonb_build_object(
      'slug',c.slug,'fullName',c.full_name,'position',c.position,'organization',c.organization_name,
      'description',c.description,'photo',c.photo_path,'contacts',c.contacts,'address',c.address,
      'language',c.language,'theme',c.theme,'template',c.template,
      'specialistTitle',c.specialist_title,'specialistCity',c.specialist_city,
      'specialistTags',c.specialist_tags,'specialistExperience',c.specialist_experience,
      'specialistSummary',c.specialist_summary,'specialistServiceArea',c.specialist_service_area,
      'specialistConsultation',c.specialist_consultation,'specialistPortfolio',c.specialist_portfolio
    ) into after_data from public.cards c where c.id=target_card_id;

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'admin_card_updated',jsonb_build_object(
    'cardId',target_card_id,'ownerId',target.owner_id,
    'changedFields',coalesce((select jsonb_agg(key) from jsonb_object_keys(before_data) key
      where before_data->key is distinct from after_data->key),'[]'::jsonb)
  ));

  select jsonb_build_object(
    'id',c.id,'ownerId',c.owner_id,'ownerName',p.full_name,'ownerEmail',coalesce(p.email,''),
    'ownerPhone',coalesce(p.phone,''),'slug',c.slug,'fullName',c.full_name,
    'position',c.position,'organization',c.organization_name,'description',c.description,
    'photo',coalesce(c.photo_path,''),'companyLogo',coalesce(c.contacts->>'companyLogo',''),
    'contacts',c.contacts,'address',c.address,'language',c.language,'theme',c.theme,'template',c.template,
    'visibility',c.visibility,'reviewStatus',c.review_status,'views',c.views,
    'verifiedAt',c.verified_at,'createdAt',c.created_at,'updatedAt',c.updated_at,
    'professionCategoryId',coalesce(c.profession_category_id::text,''),
    'specialistTitle',c.specialist_title,'specialistCity',c.specialist_city,
    'specialistTags',to_jsonb(c.specialist_tags),'specialistExperience',c.specialist_experience,
    'specialistSummary',c.specialist_summary,'specialistPlan',c.specialist_plan,
    'specialistServiceArea',c.specialist_service_area,'specialistConsultation',c.specialist_consultation,
    'specialistPortfolio',to_jsonb(c.specialist_portfolio)
  ) into result from public.cards c join public.profiles p on p.id=c.owner_id where c.id=target_card_id;
  return result;
end;
$$;

revoke all on function public.admin_update_card(uuid,jsonb) from public;
grant execute on function public.admin_update_card(uuid,jsonb) to authenticated;
revoke all on function public.admin_open_card_details(uuid,text) from public;
grant execute on function public.admin_open_card_details(uuid,text) to authenticated;
