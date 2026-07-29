create or replace function public.increment_card_views(target_card_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.cards
  set views = views + 1
  where id = target_card_id
    and review_status = 'approved'
    and visibility in ('public', 'public_organization');
$$;

grant execute on function public.increment_card_views(uuid) to anon, authenticated;
