-- VIZORA.TJ: freely configurable organization structure safeguards.
-- Run after 008_transactional_email.sql.

create or replace function public.validate_department_tree()
returns trigger language plpgsql set search_path = public
as $$
declare parent_org uuid;
declare cycle_found boolean;
begin
  if new.parent_id is null then return new; end if;
  if new.parent_id = new.id then raise exception 'A department cannot be its own parent'; end if;

  select organization_id into parent_org from public.departments where id = new.parent_id;
  if parent_org is null or parent_org <> new.organization_id then
    raise exception 'Parent department must belong to the same organization';
  end if;

  with recursive ancestors as (
    select id, parent_id from public.departments where id = new.parent_id
    union all
    select d.id, d.parent_id
    from public.departments d join ancestors a on d.id = a.parent_id
  )
  select exists(select 1 from ancestors where id = new.id) into cycle_found;
  if cycle_found then raise exception 'A circular department structure is not allowed'; end if;
  return new;
end;
$$;

drop trigger if exists validate_department_tree_trigger on public.departments;
create trigger validate_department_tree_trigger
before insert or update of organization_id, parent_id on public.departments
for each row execute function public.validate_department_tree();

create index if not exists departments_organization_parent_order_idx
  on public.departments(organization_id, parent_id, sort_order, name);

create or replace function public.move_organization_department(
  target_department_id uuid,
  target_parent_id uuid default null,
  target_sort_order integer default 0
)
returns void language plpgsql security definer set search_path = public
as $$
declare target_org uuid;
begin
  select organization_id into target_org from public.departments where id = target_department_id;
  if target_org is null then raise exception 'Department not found'; end if;
  if not public.is_organization_admin(target_org) then
    raise exception 'Organization administrator access required';
  end if;
  update public.departments
  set parent_id = target_parent_id, sort_order = greatest(0, target_sort_order)
  where id = target_department_id;
end;
$$;

grant execute on function public.move_organization_department(uuid,uuid,integer) to authenticated;
