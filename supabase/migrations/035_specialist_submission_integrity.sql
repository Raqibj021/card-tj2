-- Reliable specialist categories, atomic submissions and plan-aware moderation.
-- Run after migration 034.

insert into public.profession_categories(name_ru,name_tj,name_en,slug,enabled,requires_license) values
('Врачи и клиники','Табибон ва клиникаҳо','Doctors and clinics','medicine',true,true),
('Юристы','Ҳуқуқшиносон','Lawyers','law',true,true),
('Переводчики','Тарҷумонҳо','Translators','translation',true,false),
('Преподаватели','Омӯзгорон','Teachers','education',true,false),
('Ремонт и мастера','Таъмир ва устоҳо','Repair and trades','repair',true,false),
('Фото и дизайн','Акс ва дизайн','Photography and design','photo-design',true,false),
('Компании','Ширкатҳо','Companies','companies',true,false),
('Другие разрешённые специалисты','Дигар мутахассисони иҷозатшуда','Other permitted specialists','other',true,false)
on conflict(slug) do update set enabled=excluded.enabled,requires_license=excluded.requires_license,
  name_ru=excluded.name_ru,name_tj=excluded.name_tj,name_en=excluded.name_en;

create or replace function public.get_enabled_profession_categories(language_code text default 'ru')
returns table(id uuid,name text,requires_license boolean,slug text)
language sql stable security definer set search_path=public as $$
  select p.id,case lower(language_code) when 'tj' then p.name_tj when 'en' then p.name_en else p.name_ru end,
    p.requires_license,p.slug
  from public.profession_categories p where p.enabled=true order by p.name_ru;
$$;
revoke all on function public.get_enabled_profession_categories(text) from public;
grant execute on function public.get_enabled_profession_categories(text) to anon,authenticated;

create or replace function public.submit_specialist_profile(
  target_card_id uuid,target_category_id uuid,professional_title text,professional_city text,
  professional_tags text[],professional_experience text,professional_summary text,
  selected_plan text,service_area text,consultation_format text,portfolio_urls text[],document_paths text[]
) returns uuid language plpgsql security definer set search_path=public,auth as $$
declare request_id uuid; owner uuid; clean_title text:=trim(coalesce(professional_title,''));
begin
  if auth.uid() is null then raise exception 'Сначала войдите в аккаунт.'; end if;
  if selected_plan not in ('specialist','pro') then raise exception 'Выберите тариф специалиста.'; end if;
  if clean_title='' or trim(coalesce(professional_city,''))='' or trim(coalesce(professional_summary,''))='' then
    raise exception 'Заполните обязательные профессиональные поля.'; end if;
  if not exists(select 1 from public.profession_categories where id=target_category_id and enabled=true) then
    raise exception 'Выбранная категория недоступна.'; end if;
  if cardinality(coalesce(professional_tags,'{}'))>12 then raise exception 'Можно указать не более 12 тегов.'; end if;
  if selected_plan='pro' and cardinality(coalesce(portfolio_urls,'{}'))>20 then raise exception 'В портфолио можно добавить не более 20 фотографий.'; end if;
  select owner_id into owner from public.cards where id=target_card_id and owner_id=auth.uid() for update;
  if owner is null then raise exception 'Визитка не найдена.'; end if;

  update public.cards set profession_category_id=target_category_id,specialist_title=left(clean_title,100),
    specialist_city=left(trim(professional_city),80),specialist_tags=coalesce(professional_tags,'{}'),
    specialist_experience=left(trim(coalesce(professional_experience,'')),80),
    specialist_summary=left(trim(professional_summary),500),specialist_plan=selected_plan,
    specialist_service_area=case when selected_plan='pro' then left(trim(coalesce(service_area,'')),140) else '' end,
    specialist_consultation=case when selected_plan='pro' then left(trim(coalesce(consultation_format,'')),140) else '' end,
    specialist_portfolio=case when selected_plan='pro' then coalesce(portfolio_urls,'{}') else '{}' end,
    directory_hidden=false,directory_removed_at=null,review_status='pending',visibility='private',updated_at=now()
  where id=target_card_id;

  insert into public.verification_requests(profile_id,card_id,document_paths,status)
  values(auth.uid(),target_card_id,coalesce(document_paths,'{}'),'pending') returning id into request_id;

  insert into public.notifications(user_id,kind,title,body,action_url)
  select p.id,'specialist_submission','Новая заявка специалиста',clean_title||' — требуется проверка','/admin/moderation'
  from public.profiles p where p.role in ('admin','moderator');
  return request_id;
end $$;
revoke all on function public.submit_specialist_profile(uuid,uuid,text,text,text[],text,text,text,text,text,text[],text[]) from public;
grant execute on function public.submit_specialist_profile(uuid,uuid,text,text,text[],text,text,text,text,text,text[],text[]) to authenticated;

create or replace function public.sync_card_with_verification_decision()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.card_id is not null and new.status in ('changes_requested','rejected') and new.status is distinct from old.status then
    update public.cards set review_status=new.status,visibility='private',updated_at=now() where id=new.card_id;
  end if;
  return new;
end $$;
drop trigger if exists sync_card_with_verification_decision_trigger on public.verification_requests;
create trigger sync_card_with_verification_decision_trigger after update of status on public.verification_requests
for each row execute function public.sync_card_with_verification_decision();

create or replace function public.admin_review_card(target_card_id uuid,decision public.review_status,note text default '')
returns void language plpgsql security definer set search_path=public,auth as $$
declare target public.cards%rowtype; notification_kind text; required_plan text;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required'; end if;
  if decision not in ('approved','changes_requested','rejected','suspended') then raise exception 'Invalid review decision'; end if;
  if decision in ('changes_requested','rejected','suspended') and length(trim(coalesce(note,'')))<3 then raise exception 'Review reason is required'; end if;
  select * into target from public.cards where id=target_card_id for update;
  if target.id is null then raise exception 'Card not found'; end if;
  if decision='approved' then
    if target.profession_category_id is not null then
      required_plan:=case when target.specialist_plan='pro' then 'pro' else 'specialist' end;
      if not exists(select 1 from public.subscriptions where profile_id=target.owner_id and plan_code=required_plan and expires_at>now()) then
        raise exception 'Cannot approve: the selected specialist plan is not paid or active'; end if;
      if not exists(select 1 from public.verification_requests where card_id=target.id and status='approved') then
        raise exception 'Cannot approve: specialist verification is not approved'; end if;
    elsif not (exists(select 1 from public.subscriptions where profile_id=target.owner_id and expires_at>now())
      or exists(select 1 from public.organization_members m join public.organizations o on o.id=m.organization_id where m.profile_id=target.owner_id and o.active_until>now())) then
      raise exception 'Cannot approve: payment or launch offer is not active';
    end if;
  end if;
  update public.cards set review_status=decision,
    visibility=case when decision='approved' then case when exists(select 1 from public.organization_members where profile_id=target.owner_id)
      then 'public_organization'::public.card_visibility else 'public'::public.card_visibility end else 'private'::public.card_visibility end,
    verified_at=case when decision='approved' then now() else verified_at end,
    published_at=case when decision='approved' then now() else published_at end,trial_expires_at=null,updated_at=now()
  where id=target_card_id;
  notification_kind:=case decision when 'approved' then 'card_approved' when 'changes_requested' then 'card_changes_requested' when 'rejected' then 'card_rejected' else 'card_suspended' end;
  insert into public.notifications(user_id,kind,title,body,action_url) values(target.owner_id,notification_kind,
    case decision when 'approved' then 'Визитка одобрена' when 'changes_requested' then 'Нужно исправить визитку' when 'rejected' then 'Визитка отклонена' else 'Визитка приостановлена' end,
    case when decision='approved' then 'Визитка успешно одобрена. QR-код и публичная ссылка активированы.' else trim(note) end,'/dashboard');
  insert into public.admin_audit_log(admin_id,action,details) values(auth.uid(),'moderation_card_decision',jsonb_build_object('cardId',target_card_id,'from',target.review_status,'to',decision,'note',trim(note)));
end $$;
revoke all on function public.admin_review_card(uuid,public.review_status,text) from public;
grant execute on function public.admin_review_card(uuid,public.review_status,text) to authenticated;
