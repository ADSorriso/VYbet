create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '', birth_date date,
 vip_level text not null default 'bronze',
 demo_balance numeric(12,2) not null default 1000 check (demo_balance >= 0),
 created_at timestamptz not null default now()
);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,name,birth_date) values(new.id,coalesce(new.raw_user_meta_data->>'name',''),nullif(new.raw_user_meta_data->>'birth_date','')::date); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table if not exists public.competitions(id uuid primary key default gen_random_uuid(),name text not null,slug text unique not null,country text);
create table if not exists public.teams(id uuid primary key default gen_random_uuid(),name text not null,short_name text,logo_url text,country text);
create table if not exists public.matches(id uuid primary key default gen_random_uuid(),competition_id uuid references public.competitions(id),home_team_id uuid references public.teams(id),away_team_id uuid references public.teams(id),start_time timestamptz not null,status text not null default 'scheduled',home_score int,away_score int,constraint matches_home_team_id_fkey foreign key(home_team_id) references public.teams(id),constraint matches_away_team_id_fkey foreign key(away_team_id) references public.teams(id));
create table if not exists public.markets(id uuid primary key default gen_random_uuid(),match_id uuid not null references public.matches(id) on delete cascade,name text not null,market_key text not null);
create table if not exists public.odds(id uuid primary key default gen_random_uuid(),market_id uuid not null references public.markets(id) on delete cascade,selection_key text not null,label text not null,value numeric(8,2) not null check(value>=1),active boolean not null default true);
create table if not exists public.demo_bets(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,stake numeric(12,2) not null check(stake>0),total_odd numeric(12,2) not null,potential_return numeric(12,2) not null,status text not null default 'open',created_at timestamptz not null default now());
create table if not exists public.demo_bet_selections(id uuid primary key default gen_random_uuid(),bet_id uuid not null references public.demo_bets(id) on delete cascade,match_id uuid references public.matches(id),market text not null,selection text not null,odd numeric(8,2) not null);
create table if not exists public.casino_games(id uuid primary key default gen_random_uuid(),name text not null,category text not null,provider text,thumbnail_url text,demo_url text,active boolean not null default true);
create table if not exists public.casino_favorites(user_id uuid references auth.users(id) on delete cascade,game_id uuid references public.casino_games(id) on delete cascade,primary key(user_id,game_id));
create table if not exists public.promotions(id uuid primary key default gen_random_uuid(),title text not null,description text,active boolean not null default true,created_at timestamptz not null default now());

alter table public.profiles enable row level security;
alter table public.demo_bets enable row level security;
alter table public.demo_bet_selections enable row level security;
create policy "profile own read" on public.profiles for select using(auth.uid()=id);
create policy "profile own update" on public.profiles for update using(auth.uid()=id);
create policy "bets own read" on public.demo_bets for select using(auth.uid()=user_id);
create policy "bets own insert" on public.demo_bets for insert with check(auth.uid()=user_id);
create policy "selections through own bet read" on public.demo_bet_selections for select using(exists(select 1 from public.demo_bets b where b.id=bet_id and b.user_id=auth.uid()));
