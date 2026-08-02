-- Professional directory details extend the existing digital card.
-- Run after migration 031.

alter table public.cards
  add column if not exists specialist_title text not null default '',
  add column if not exists specialist_city text not null default '',
  add column if not exists specialist_tags text[] not null default '{}',
  add column if not exists specialist_experience text not null default '',
  add column if not exists specialist_summary text not null default '';

alter table public.cards drop constraint if exists cards_specialist_title_length;
alter table public.cards add constraint cards_specialist_title_length
  check (char_length(specialist_title) <= 100);
alter table public.cards drop constraint if exists cards_specialist_city_length;
alter table public.cards add constraint cards_specialist_city_length
  check (char_length(specialist_city) <= 80);
alter table public.cards drop constraint if exists cards_specialist_experience_length;
alter table public.cards add constraint cards_specialist_experience_length
  check (char_length(specialist_experience) <= 80);
alter table public.cards drop constraint if exists cards_specialist_summary_length;
alter table public.cards add constraint cards_specialist_summary_length
  check (char_length(specialist_summary) <= 500);
alter table public.cards drop constraint if exists cards_specialist_tags_count;
alter table public.cards add constraint cards_specialist_tags_count
  check (cardinality(specialist_tags) <= 12);

create index if not exists cards_specialist_directory_idx
  on public.cards(profession_category_id, specialist_city, published_at desc)
  where review_status = 'approved' and visibility in ('public', 'public_organization');

update public.cards
set specialist_title = position,
    specialist_city = case
      when address ilike '%душанбе%' then 'Душанбе'
      else specialist_city
    end
where profession_category_id is not null
  and specialist_title = '';

