-- VIZORA.TJ: permanent card deletion no longer deletes storage rows in SQL.
-- Supabase blocks direct deletes from storage.objects (protect_delete trigger).
-- The function now deletes the card and returns its file paths; the admin app
-- removes those files through the Storage API, which needs the policy below.
-- Run after 043 (or the last applied migration).

create policy "admin deletes card assets" on storage.objects
for delete to authenticated
using (bucket_id = 'card-assets' and public.is_platform_admin());

drop function if exists public.admin_delete_card_permanently(uuid);

create or replace function public.admin_delete_card_permanently(target_card_id uuid)
returns text[]
language plpgsql security definer set search_path = public, storage
as $$
declare
  selected public.cards%rowtype;
  selected_owner_email text;
  file_paths text[];
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required';
  end if;

  select * into selected from public.cards where id=target_card_id for update;
  if selected.id is null then
    raise exception 'Card not found';
  end if;

  select coalesce(email,'') into selected_owner_email
  from public.profiles where id=selected.owner_id;

  select coalesce(array_agg(name), '{}') into file_paths
  from storage.objects
  where bucket_id='card-assets'
    and name like selected.owner_id::text || '/' || selected.id::text || '/%';

  insert into public.admin_audit_log(admin_id,action,details)
  values(auth.uid(),'card_deleted_permanently',jsonb_build_object(
    'cardId',selected.id,
    'ownerId',selected.owner_id,
    'ownerEmail',selected_owner_email,
    'slug',selected.slug,
    'fullName',selected.full_name,
    'organization',selected.organization_name,
    'visibility',selected.visibility,
    'reviewStatus',selected.review_status,
    'deletedAt',now()
  ));

  delete from public.cards where id=selected.id;
  return file_paths;
end;
$$;

revoke all on function public.admin_delete_card_permanently(uuid) from public;
grant execute on function public.admin_delete_card_permanently(uuid) to authenticated;
