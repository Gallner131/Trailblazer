-- Trailblazer Sections 17-19: Safety, Sharing, Search
-- Add columns and functions for reporting, visibility, and public access
-- Run this in Supabase SQL Editor

-- 1. Add hidden_by_reports to segments (if not already present)
alter table public.segments
add column if not exists hidden_by_reports boolean not null default false;

create index if not exists segments_hidden_by_reports_idx
on public.segments (hidden_by_reports, cell);

-- 2. Add created_at to segment_reports if missing (for sorting)
-- (Already has created_at, so this is a check)

-- 3. Create index for report counting
create index if not exists segment_reports_segment_idx
on public.segment_reports (segment_id);

-- 4. Function to update segment visibility based on report count
-- This checks if 3+ different users have reported a segment and marks it hidden
create or replace function public.check_segment_hidden()
returns trigger as $$
declare
  report_count integer;
  unique_reporters integer;
begin
  -- Count total reports on this segment
  select count(*) into report_count
  from public.segment_reports
  where segment_id = new.segment_id;

  -- Count unique reporters
  select count(distinct user_id) into unique_reporters
  from public.segment_reports
  where segment_id = new.segment_id;

  -- If 3 or more unique users have reported, hide the segment
  if unique_reporters >= 3 then
    update public.segments
    set hidden_by_reports = true
    where id = new.segment_id;
  end if;

  return new;
end;
$$ language plpgsql;

-- Trigger to run after each report is inserted
drop trigger if exists check_segment_hidden_trigger on public.segment_reports;
create trigger check_segment_hidden_trigger
after insert on public.segment_reports
for each row
execute function public.check_segment_hidden();

-- 5. Update RLS policies to exclude reported/hidden segments
drop policy if exists "read visible segments" on public.segments;
create policy "read visible segments" on public.segments
  for select using (hidden = false and approved = true and hidden_by_reports = false);

-- 6. Allow unauthenticated users to read segments on public pages
create policy "read segments for public pages" on public.segments
  for select using (hidden = false and approved = true and hidden_by_reports = false);

-- 7. Allow unauthenticated users to read runs for leaderboards
drop policy if exists "read all runs" on public.runs;
create policy "read all runs" on public.runs
  for select using (true);

-- 8. Allow unauthenticated users to read profiles (for leaderboard names)
drop policy if exists "read all profiles" on public.profiles;
create policy "read all profiles" on public.profiles
  for select using (true);
