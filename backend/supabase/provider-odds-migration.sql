create table if not exists public.provider_odds (
  id uuid primary key default gen_random_uuid(),

  match_key text not null,
  provider text not null default 'api-football',
  provider_fixture_id text not null,

  bookmaker_id integer,
  bookmaker_name text not null,

  market_id integer not null,
  market_name text not null,

  selection_key text not null,
  selection_label text not null,
  odd numeric(10,2) not null check (odd >= 1),

  updated_at timestamptz not null default now(),

  constraint provider_odds_unique
    unique (
      provider,
      provider_fixture_id,
      bookmaker_id,
      market_id,
      selection_key
    )
);

create index if not exists provider_odds_match_key_idx
  on public.provider_odds(match_key);

create index if not exists provider_odds_fixture_idx
  on public.provider_odds(provider_fixture_id);

create index if not exists provider_odds_market_idx
  on public.provider_odds(market_id);

alter table public.provider_odds enable row level security;
