-- Metadados de partidas importadas da API-Football.
alter table public.demo_match_results
  add column if not exists league_name text,
  add column if not exists league_country text,
  add column if not exists start_time timestamptz,
  add column if not exists provider_status text;

create index if not exists demo_match_results_provider_start_idx
  on public.demo_match_results(provider,start_time);
