-- Trailblazer v2 Complete Schema
-- This replaces schema-section-1.sql with the full SPEC.md v2 requirements
-- Paste this entire file into Supabase SQL Editor and run it.

-- Drop old tables if they exist (migration from old schema)
-- Note: This is destructive. Only run if you understand the data impact.
-- drop table if exists public.runs cascade;
-- drop table if exists public.segments cascade;
-- drop table if exists public.profiles cascade;

-- PROFILES: one row per signed-in user
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  level         smallint not null default 1 check (level between 0 and 3),
  home_lat      double precision,
  home_lng      double precision,
  home_label    text,
  units         text not null default 'metric' check (units in ('metric','imperial')),
  created_at    timestamptz not null default now()
);

-- SEGMENTS: harvested from OpenStreetMap, curated, kept permanently
create table if not exists public.segments (
  id            bigint primary key,          -- OSM way id, or lowest id of a merged group
  name          text not null,
  highway       text not null,
  surface       text,
  length_m      integer not null check (length_m between 300 and 1000),
  geom          jsonb not null,              -- ordered [[lat,lng], ...]
  start_lat     double precision not null,
  start_lng     double precision not null,
  end_lat       double precision not null,
  end_lng       double precision not null,
  centre_lat    double precision not null,
  centre_lng    double precision not null,
  cell          text not null,               -- lat/lng to 2dp, ~1.1 km
  climb_m       integer,
  net_grade     numeric(5,1),
  elevation     jsonb,                       -- smoothed profile
  quality       smallint not null default 0, -- §6.4 score, 0-100
  hidden        boolean not null default false,
  approved      boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists segments_cell_idx    on public.segments (cell);
create index if not exists segments_centre_idx  on public.segments (centre_lat, centre_lng);
create index if not exists segments_quality_idx on public.segments (cell, quality desc)
  where hidden = false and approved = true;

-- RUNS: one per user per segment per day
create table if not exists public.runs (
  id           uuid primary key default gen_random_uuid(),
  segment_id   bigint not null references public.segments(id),
  user_id      uuid   not null references public.profiles(id) on delete cascade,
  run_date     date   not null default current_date,
  seconds      numeric(6,1) not null check (seconds > 10 and seconds < 3600),
  level        smallint not null check (level between 0 and 3),
  ranked       boolean not null default true,
  unranked_reason text,
  featured     boolean not null default false,  -- was this the day's featured segment
  created_at   timestamptz not null default now(),
  unique (segment_id, user_id, run_date)
);
create index if not exists runs_board_idx on public.runs (segment_id, run_date, seconds);
create index if not exists runs_user_idx  on public.runs (user_id, created_at desc);
create index if not exists runs_today_idx on public.runs (run_date, segment_id);

-- SEGMENT REPORTS: safety
create table if not exists public.segment_reports (
  id          uuid primary key default gen_random_uuid(),
  segment_id  bigint not null references public.segments(id),
  user_id     uuid   not null references public.profiles(id) on delete cascade,
  reason      text   not null check (reason in
                ('unsafe','private','obstructed','wrong_name','not_there','other')),
  detail      text,
  created_at  timestamptz not null default now(),
  unique (segment_id, user_id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.segments enable row level security;
alter table public.runs enable row level security;
alter table public.segment_reports enable row level security;

-- PROFILES Policies
drop policy if exists "read all profiles" on public.profiles;
drop policy if exists "write own profile" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
create policy "read all profiles" on public.profiles
  for select using (true);
create policy "write own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- SEGMENTS Policies
drop policy if exists "read segments" on public.segments;
drop policy if exists "signed-in users may add segments" on public.segments;
create policy "read visible segments" on public.segments
  for select using (hidden = false and approved = true);
create policy "signed-in users may add segments" on public.segments
  for insert to authenticated with check (true);

-- RUNS Policies
drop policy if exists "read all runs" on public.runs;
drop policy if exists "insert own runs" on public.runs;
drop policy if exists "update own runs" on public.runs;
create policy "read all runs" on public.runs
  for select using (true);
create policy "insert own runs" on public.runs
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update own runs" on public.runs
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SEGMENT_REPORTS Policies
drop policy if exists "read own reports" on public.segment_reports;
drop policy if exists "insert own report" on public.segment_reports;
create policy "read own reports"  on public.segment_reports
  for select to authenticated using (auth.uid() = user_id);
create policy "insert own report" on public.segment_reports
  for insert to authenticated with check (auth.uid() = user_id);
