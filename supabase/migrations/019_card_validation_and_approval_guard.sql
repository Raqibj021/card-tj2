-- VIZORA.TJ: strict card validation and administrator-only approval.
-- Run after 018_admin_delete_card.sql.

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
  is_privileged boolean := auth.role() = 'service_role' or public.is_staff();
  material_changed boolean := false;
begin
  new.full_name := trim(regexp_replace(coalesce(new.full_name,''),'\s+',' ','g'));
  new.position := trim(regexp_replace(coalesce(new.position,''),'\s+',' ','g'));
  new.organization_name := trim(regexp_replace(coalesce(new.organization_name,''),'\s+',' ','g'));

  if new.full_name !~ '^[[:alpha:]][[:alpha:]''’ʼ-]{1,}([[:space:]]+[[:alpha:]][[:alpha:]''’ʼ-]{1,})+$' then
    raise exception 'Введите настоящее имя и фамилию';
  end if;
  if length(new.position) < 2 then raise exception 'Укажите должность'; end if;
  if length(new.organization_name) < 2 then raise exception 'Укажите место работы'; end if;
  if primary_phone !~ '^992[0-9]{9}$' then
    raise exception 'Введите полный номер телефона: +992 и 9 цифр';
  end if;
  if second_phone <> '' and second_phone !~ '^992[0-9]{9}$' then
    raise exception 'Второй номер телефона заполнен неверно';
  end if;
  if whatsapp_phone <> '' and whatsapp_phone !~ '^992[0-9]{9}$' then
    raise exception 'Номер WhatsApp заполнен неверно';
  end if;
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
  else
    material_changed :=
      old.full_name is distinct from new.full_name or
      old.position is distinct from new.position or
      old.organization_name is distinct from new.organization_name or
      old.description is distinct from new.description or
      old.photo_path is distinct from new.photo_path or
      old.contacts is distinct from new.contacts or
      old.address is distinct from new.address;

    if not is_privileged then
      if old.review_status <> 'approved' and new.review_status = 'approved' then
        raise exception 'Только администратор может одобрить визитку';
      end if;
      if old.review_status = 'approved' and material_changed then
        new.review_status := 'pending';
        new.visibility := 'private';
        new.verified_at := null;
        new.published_at := null;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Previously approved test cards with malformed required data are returned
-- to moderation immediately. Valid approved cards are not changed.
update public.cards
set
  review_status = 'pending',
  visibility = 'private',
  verified_at = null,
  published_at = null,
  updated_at = now()
where review_status = 'approved'
  and (
    trim(full_name) !~ '^[[:alpha:]][[:alpha:]''’ʼ-]{1,}([[:space:]]+[[:alpha:]][[:alpha:]''’ʼ-]{1,})+$'
    or length(trim(position)) < 2
    or length(trim(organization_name)) < 2
    or regexp_replace(coalesce(contacts->>'phone',''),'[^0-9]','','g') !~ '^992[0-9]{9}$'
    or (
      nullif(trim(coalesce(contacts->>'email','')),'') is not null
      and lower(trim(contacts->>'email')) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  );

drop trigger if exists validate_and_protect_card_trigger on public.cards;
create trigger validate_and_protect_card_trigger
before insert or update on public.cards
for each row execute function public.validate_and_protect_card();
