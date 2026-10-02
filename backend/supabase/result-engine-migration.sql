alter table public.demo_bet_selections
  add column if not exists match_key text,
  add column if not exists result text not null default 'pending';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'demo_bet_selections_result_check'
  ) then
    alter table public.demo_bet_selections
      add constraint demo_bet_selections_result_check
      check (result in ('pending','won','lost'));
  end if;
end $$;

create index if not exists demo_bet_selections_match_key_idx
  on public.demo_bet_selections(match_key);

create index if not exists demo_bet_selections_bet_id_result_idx
  on public.demo_bet_selections(bet_id,result);
