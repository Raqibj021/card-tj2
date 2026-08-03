-- Approved organization owners can update public profile fields without a new review.
-- The first application and payment activation remain subject to the existing moderation flow.

create or replace function public.update_approved_organization_profile(
  target_organization_id uuid,
  organization_name text,
  organization_type text,
  organization_phone text,
  organization_email text,
  organization_address text default '',
  public_description text default '',
  organization_logo text default ''
)
returns public.organizations
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target public.organizations%rowtype;
  result public.organizations%rowtype;
  stored_details jsonb := '{}'::jsonb;
  clean_name text := trim(coalesce(organization_name, ''));
  clean_type text := trim(coalesce(organization_type, ''));
  clean_phone text := trim(coalesce(organization_phone, ''));
  clean_email text := lower(trim(coalesce(organization_email, '')));
  clean_address text := trim(coalesce(organization_address, ''));
  clean_description text := trim(coalesce(public_description, ''));
  clean_logo text := trim(coalesce(organization_logo, ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into target
  from public.organizations
  where id = target_organization_id
  for update;

  if target.id is null then
    raise exception 'Organization not found';
  end if;
  if target.owner_id <> auth.uid() then
    raise exception 'Only the organization creator can edit its general details';
  end if;
  if target.review_status <> 'approved' then
    raise exception 'The initial organization approval is required';
  end if;
  if target.active_until is null or target.active_until <= now() then
    raise exception 'An active organization plan is required';
  end if;

  if char_length(clean_name) not between 2 and 160 then raise exception 'Invalid organization name'; end if;
  if char_length(clean_type) not between 2 and 100 then raise exception 'Invalid organization type'; end if;
  if char_length(regexp_replace(clean_phone, '[^0-9]', '', 'g')) not between 9 and 15 then raise exception 'Invalid phone number'; end if;
  if char_length(clean_email) not between 5 and 160 or position('@' in clean_email) <= 1 then raise exception 'Invalid email'; end if;
  if char_length(clean_address) > 240 then raise exception 'Address is too long'; end if;
  if char_length(clean_description) > 500 then raise exception 'Description is too long'; end if;
  if char_length(clean_logo) > 4096 then raise exception 'Logo URL is too long'; end if;

  begin
    stored_details := coalesce(nullif(target.description, ''), '{}')::jsonb;
    if jsonb_typeof(stored_details) <> 'object' then stored_details := '{}'::jsonb; end if;
  exception when others then
    stored_details := '{}'::jsonb;
  end;
  stored_details := stored_details || jsonb_build_object('publicDescription', clean_description);

  update public.organizations
  set legal_name = clean_name,
      display_name = clean_name,
      organization_type = clean_type,
      phone = clean_phone,
      email = clean_email,
      address = clean_address,
      logo_path = clean_logo,
      description = stored_details::text,
      updated_at = now()
  where id = target_organization_id
  returning * into result;

  insert into public.admin_audit_log(admin_id, action, details)
  values (auth.uid(), 'organization_profile_updated', jsonb_build_object(
    'organizationId', target_organization_id,
    'reviewStatus', result.review_status,
    'automaticApproval', true
  ));

  return result;
end;
$$;

revoke all on function public.update_approved_organization_profile(uuid,text,text,text,text,text,text,text) from public;
grant execute on function public.update_approved_organization_profile(uuid,text,text,text,text,text,text,text) to authenticated;
