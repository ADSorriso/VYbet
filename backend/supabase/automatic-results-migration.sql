-- Fila de resultados finais do protótipo. Um provedor esportivo pode fazer upsert aqui.
create table if not exists public.demo_match_results (
  match_key text primary key,
  provider text,
  provider_fixture_id text,
  home_team text not null,
  away_team text not null,
  home_score integer check (home_score >= 0),
  away_score integer check (away_score >= 0),
  status text not null default 'scheduled' check (status in ('scheduled','live','finished','cancelled')),
  updated_at timestamptz not null default now(),
  settled_at timestamptz
);
create unique index if not exists demo_match_results_provider_fixture_uidx
  on public.demo_match_results(provider,provider_fixture_id)
  where provider is not null and provider_fixture_id is not null;
alter table public.demo_match_results enable row level security;
-- Sem policies públicas: leitura/escrita somente pelo backend service role.
