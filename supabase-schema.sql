-- Daily Segment Supabase Schema
-- Run this in the Supabase dashboard SQL editor

-- 1. USERS PROFILE (mirrors auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  level text not null default 'steady' check (level in ('new','steady','quick','elite')),
  home_cell text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- 2. SEGMENTS (curated from OSM)
create table if not exists public.segments (
  id text primary key,
  name text not null,
  cell text not null,
  distance_m numeric not null check (distance_m between 50 and 5000),
  geometry jsonb not null,
  start_gate jsonb not null,
  finish_gate jsonb not null,
  approved boolean not null default false,
  safety_score numeric,
  created_at timestamptz not null default now()
);

alter table public.segments enable row level security;

create policy "read approved segments" on public.segments
  for select using (approved = true);

-- 3. SEGMENT ELEVATION CACHE
create table if not exists public.segment_elevation (
  segment_id text primary key references public.segments(id) on delete cascade,
  total_gain_m numeric,
  profile jsonb,
  cached_at timestamptz not null default now()
);

alter table public.segment_elevation enable row level security;

create policy "read elevation" on public.segment_elevation
  for select using (true);

-- 4. DAILY SEGMENTS (materialized segment-of-the-day)
create table if not exists public.daily_segments (
  run_date date not null,
  cell text not null,
  segment_id text not null references public.segments(id),
  primary key (run_date, cell)
);

alter table public.daily_segments enable row level security;

create policy "read daily" on public.daily_segments
  for select using (true);

-- 5. RUNS (authoritative leaderboard times)
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  segment_id text not null references public.segments(id),
  segment_name text not null,
  run_date date not null,
  runner_id uuid not null references public.profiles(id),
  runner_name text not null,
  seconds numeric not null check (seconds > 0),
  distance_m numeric not null,
  level text not null,
  ranked boolean not null default true,
  validated boolean not null default false,
  created_at timestamptz not null default now(),
  unique (segment_id, run_date, runner_id)
);

alter table public.runs enable row level security;

create policy "read all runs" on public.runs
  for select using (true);

create policy "insert own run" on public.runs
  for insert with check (auth.uid() = runner_id);

create policy "update own run" on public.runs
  for update using (auth.uid() = runner_id) with check (auth.uid() = runner_id);

create index if not exists runs_leaderboard_idx on public.runs (segment_id, run_date, level, seconds);
create index if not exists runs_runner_idx on public.runs (runner_id, created_at desc);

-- 6. COLLECTIONS (segment completion tracking)
create table if not exists public.collections (
  runner_id uuid not null references public.profiles(id),
  segment_id text not null references public.segments(id),
  first_collected date not null,
  best_seconds numeric,
  rarity text,
  primary key (runner_id, segment_id)
);

alter table public.collections enable row level security;

create policy "read own collection" on public.collections
  for select using (auth.uid() = runner_id);

create policy "insert own collection" on public.collections
  for insert with check (auth.uid() = runner_id);

-- 7. STREAKS
create table if not exists public.streaks (
  runner_id uuid primary key references public.profiles(id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  freezes_available int not null default 2,
  last_active date,
  updated_at timestamptz not null default now()
);

alter table public.streaks enable row level security;

create policy "read own streak" on public.streaks
  for select using (auth.uid() = runner_id);

create policy "insert own streak" on public.streaks
  for insert with check (auth.uid() = runner_id);

create policy "update own streak" on public.streaks
  for update using (auth.uid() = runner_id) with check (auth.uid() = runner_id);

-- AUTO-CREATE PROFILES AND STREAKS ON AUTH SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data->>'display_name')
  on conflict (id) do nothing;

  insert into public.streaks (runner_id)
  values (new.id)
  on conflict (runner_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
