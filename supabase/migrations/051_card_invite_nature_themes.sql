-- Nature covers on /free map to card colour themes.
create or replace function public.card_invite_theme(p_design text)
returns text language sql immutable as $$
  select case p_design
    when 'pamir' then 'blue'
    when 'lake' then 'teal'
    when 'aurora' then 'violet'
    when 'stars' then 'navy'
    when 'sunrise' then 'blue'
    when 'river' then 'teal'
    else 'blue' end;
$$;
