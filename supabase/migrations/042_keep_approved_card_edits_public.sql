-- Preserve an existing approval when an owner edits their card.
create or replace function public.validate_and_protect_card()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  primary_phone text := regexp_replace(coalesce(new.contacts->>'phone',''),'[^0-9]','','g');
  second_phone text := regexp_replace(coalesce(new.contacts->>'secondPhone',''),'[^0-9]','','g');
  whatsapp_phone text := regexp_replace(coalesce(new.contacts->>'whatsapp',''),'[^0-9]','','g');
  contact_email text := lower(trim(coalesce(new.contacts->>'email','')));
  is_organization_managed boolean := false;
  is_privileged boolean;
begin
  is_organization_managed :=
    coalesce(current_setting('vizora.organization_managed', true), '') = 'on'
    and exists(
      select 1
      from public.organization_members m
      join public.organizations o on o.id = m.organization_id
      where m.profile_id = new.owner_id
        and o.review_status = 'approved'
        and o.active_until > now()
        and o.display_name = new.organization_name
    );
  is_privileged := auth.role() = 'service_role' or public.is_staff() or is_organization_managed;

  new.full_name := trim(regexp_replace(coalesce(new.full_name,''),'\s+',' ','g'));
  new.position := trim(regexp_replace(coalesce(new.position,''),'\s+',' ','g'));
  new.organization_name := trim(regexp_replace(coalesce(new.organization_name,''),'\s+',' ','g'));

  if new.full_name !~ '^[[:alpha:]][[:alpha:]''’ʼ-]{1,}([[:space:]]+[[:alpha:]][[:alpha:]''’ʼ-]{1,})+$' then
    raise exception 'Введите настоящее имя и фамилию';
  end if;
  if length(new.position) < 2 then raise exception 'Укажите должность'; end if;
  if length(new.organization_name) < 2 then raise exception 'Укажите место работы'; end if;
  if primary_phone !~ '^992[0-9]{9}$' then raise exception 'Введите полный номер телефона: +992 и 9 цифр'; end if;
  if second_phone <> '' and second_phone !~ '^992[0-9]{9}$' then raise exception 'Второй номер телефона заполнен неверно'; end if;
  if whatsapp_phone <> '' and whatsapp_phone !~ '^992[0-9]{9}$' then raise exception 'Номер WhatsApp заполнен неверно'; end if;
  if contact_email <> '' and contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Электронная почта заполнена неверно';
  end if;

  if tg_op = 'INSERT' then
    if not is_privileged and new.review_status = 'approved' then
      new.review_status := 'draft';
      new.visibility := 'private';
      new.verified_at := null;
      new.published_at := null;
    end if;
  elsif not is_privileged and old.review_status <> 'approved' and new.review_status = 'approved' then
    raise exception 'Только администратор может одобрить визитку';
  end if;
  return new;
end;
$$;
