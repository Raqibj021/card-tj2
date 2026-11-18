-- Approved free cards that nobody claims within 3 days are deleted
-- automatically (hourly pg_cron job). The invite is kept as 'expired'.

alter table public.card_invites add column if not exists approved_at timestamptz;
update public.card_invites set approved_at = coalesce(approved_at, updated_at) where status = 'approved';

alter table public.card_invites drop constraint if exists card_invites_status_check;
alter table public.card_invites add constraint card_invites_status_check
  check (status = any (array['new','approved','rejected','claimed','expired']));

create or replace function public.card_invites_stamp_approved()
returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
    new.approved_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists card_invites_stamp_approved on public.card_invites;
create trigger card_invites_stamp_approved before insert or update of status on public.card_invites
for each row execute function public.card_invites_stamp_approved();

create or replace function public.expire_unclaimed_card_invites()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count int := 0; r record;
begin
  for r in
    select id, card_id from public.card_invites
     where status = 'approved' and approved_at < now() - interval '3 days'
     for update skip locked
  loop
    if r.card_id is not null then
      delete from public.cards where id = r.card_id;
    end if;
    update public.card_invites
       set status = 'expired', card_id = null, admin_note = coalesce(nullif(admin_note, ''), 'Удалена: не зарегистрировался за 3 дня'), updated_at = now()
     where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
revoke all on function public.expire_unclaimed_card_invites() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'expire-unclaimed-free-cards';
select cron.schedule('expire-unclaimed-free-cards', '7 * * * *', 'select public.expire_unclaimed_card_invites()');
