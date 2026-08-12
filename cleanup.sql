-- Cleanup: Remove test row and short segments, enforce valid length range
-- Run in Supabase SQL editor once schema migration is applied

-- 1. Delete the RLS probe row (test data)
delete from public.segments where id = 999999901;

-- 2. Delete all segments under 300m (too short for running)
delete from public.segments where length_m < 300;

-- 3. Add constraint to enforce valid length range in future inserts
alter table public.segments
  drop constraint if exists "segments_length_m_check",
  add constraint "segments_length_m_check" check (length_m between 300 and 1000);
