-- Trailblazer Section 1: Data Model
-- Paste this entire file into Supabase SQL Editor and run it.

-- PROFILES: one row per signed-in user
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  level         smallint not null default 1 check (level between 0 and 3),
  home_lat      double precision,
  home_lng      double precision,
  home_label    text,
  created_at    timestamptz not null default now()
);

-- SEGMENTS: harvested from OpenStreetMap, kept permanently
create table public.segments (
  id            bigint primary key,              -- OSM way id
  name          text not null,
  highway       text not null,
  surface       text,
  length_m      integer not null check (length_m between 100 and 1000),
  geom          jsonb not null,                  -- ordered [[lat,lng], ...]
  start_lat     double precision not null,
  start_lng     double precision not null,
  end_lat       double precision not null,
  end_lng       double precision not null,
  centre_lat    double precision not null,
  centre_lng    double precision not null,
  cell          text not null,                   -- lat/lng to 2dp, ~1.1 km
  climb_m       integer,
  net_grade     numeric(5,1),
  elevation     jsonb,                           -- smoothed profile
  approved      boolean not null default true,
  created_at    timestamptz not null default now()
);
create index segments_cell_idx   on public.segments (cell);
create index segments_centre_idx on public.segments (centre_lat, centre_lng);

-- RUNS: one per user per segment per day
create table public.runs (
  id          uuid primary key default gen_random_uuid(),
  segment_id  bigint not null references public.segments(id),
  user_id     uuid   not null references public.profiles(id) on delete cascade,
  run_date    date   not null default current_date,
  seconds     numeric(6,1) not null check (seconds > 10 and seconds < 3600),
  level       smallint not null check (level between 0 and 3),
  ranked      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (segment_id, user_id, run_date)
);
create index runs_board_idx   on public.runs (segment_id, run_date, seconds);
create index runs_user_idx    on public.runs (user_id, created_at desc);
create index runs_today_idx   on public.runs (run_date, segment_id);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.segments enable row level security;
alter table public.runs     enable row level security;

-- PROFILES Policies
create policy "read all profiles" on public.profiles
  for select using (true);
create policy "write own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- SEGMENTS Policies
create policy "read segments" on public.segments
  for select using (true);
create policy "signed-in users may add segments" on public.segments
  for insert to authenticated with check (true);

-- RUNS Policies
create policy "read all runs" on public.runs
  for select using (true);
create policy "insert own runs" on public.runs
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update own runs" on public.runs
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
