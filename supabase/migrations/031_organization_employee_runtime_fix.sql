-- Runtime hardening for organization employee cards.
-- Only the organization creator can manage its structure and employee cards.

create or replace function public.assert_organization_manager(target_organization_id uuid)
returns public.organizations language plpgsql security definer set search_path=public as $$
declare target public.organizations%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select o.* into target
  from public.organizations o
  where o.id=target_organization_id and o.owner_id=auth.uid();
  if target.id is null then raise exception 'Управлять организацией может только её создатель'; end if;
  return target;
end; $$;
revoke all on function public.assert_organization_manager(uuid) from public;

create or replace function public.get_organization_workspace(target_organization_id uuid)
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'organization',to_jsonb(o),
 'departments',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'name',d.name,'parent_id',d.parent_id) order by d.sort_order,d.name) from departments d where d.organization_id=o.id),'[]'::jsonb),
 'employees',coalesce((select jsonb_agg(jsonb_build_object(
   'id',a.id,'profileId',a.profile_id,'name',a.full_name,'position',a.position,
   'departmentId',a.department_id,'department',coalesce(d.name,'—'),'isPublic',a.is_public,
   'cardSlug',a.slug,'cardStatus',case when a.is_active then 'approved' else 'inactive' end,
   'phone',a.phone,'secondPhone',a.second_phone,'whatsapp',a.whatsapp,'email',a.email,
   'website',a.website,'address',a.address,'telegram',a.telegram,'instagram',a.instagram,
   'facebook',a.facebook,'description',a.description,'photo',a.photo_path,
   'companyLogo',a.company_logo_path,'language',a.language,'theme',a.theme,'template',a.template
 ) order by a.full_name) from employee_assignments a left join departments d on d.id=a.department_id where a.organization_id=o.id),'[]'::jsonb),
 'invitations','[]'::jsonb
) from organizations o where o.id=target_organization_id and o.owner_id=auth.uid();
$$;
revoke all on function public.get_organization_workspace(uuid) from public;
grant execute on function public.get_organization_workspace(uuid) to authenticated;

-- Explicit grants are repeated so partially applied earlier migrations are repaired.
grant execute on function public.create_organization_employee_card(uuid,text,text,text,text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;
grant execute on function public.update_organization_employee_card(uuid,text,text,text,text,uuid,text,text,text,text,text,text,text,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function public.remove_organization_employee(uuid) to authenticated;
grant execute on function public.get_public_organization(text) to anon,authenticated;
grant execute on function public.get_public_organization_employee(text) to anon,authenticated;
