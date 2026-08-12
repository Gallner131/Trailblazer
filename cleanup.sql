-- Cleanup: Remove junk and invalid segments
-- Paste into Supabase SQL Editor and run AFTER schema-fix.sql

-- Remove test/junk rows
delete from public.segments where id = 999999901;
delete from public.segments where name = 'RLS probe';

-- Remove all segments under 300 m (below timing floor per §2.3)
delete from public.segments where length_m < 300;

-- Add length constraint
alter table public.segments
add constraint segments_length_check check (length_m between 300 and 1000);

-- List remaining segments to verify
-- select count(*), min(length_m), max(length_m) from public.segments;
