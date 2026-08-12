-- Trailblazer Schema Fix
-- Adds missing columns and tables for spec v2 compliance
-- Paste into Supabase SQL Editor and run

alter table public.segments  add column if not exists quality smallint not null default 0;
alter table public.segments  add column if not exists hidden boolean not null default false;
alter table public.profiles  add column if not exists units text not null default 'metric'
  check (units in ('metric','imperial'));
alter table public.runs      add column if not exists featured boolean not null default false;
alter table public.runs      add column if not exists unranked_reason text;

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
alter table public.segment_reports enable row level security;
create policy "read own reports"  on public.segment_reports
  for select to authenticated using (auth.uid() = user_id);
create policy "insert own report" on public.segment_reports
  for insert to authenticated with check (auth.uid() = user_id);

create index if not exists segments_quality_idx on public.segments (cell, quality desc)
  where hidden = false and approved = true;

create policy "read visible segments" on public.segments
  for select using (hidden = false and approved = true);
