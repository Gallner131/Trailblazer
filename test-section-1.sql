-- Trailblazer Section 1: Data Model Acceptance Tests
-- Run this AFTER schema-section-1.sql
-- Paste into Supabase SQL Editor to verify tables, policies, and queries work.

-- VERIFY TABLES EXIST
select table_name from information_schema.tables
where table_schema = 'public' and table_name in ('profiles', 'segments', 'runs')
order by table_name;
-- Expected output: profiles, runs, segments (3 rows)

-- VERIFY INDEXES EXIST
select indexname from pg_indexes
where schemaname = 'public' and tablename in ('profiles', 'segments', 'runs')
order by indexname;
-- Expected output: runs_board_idx, runs_today_idx, runs_user_idx, segments_cell_idx, segments_centre_idx

-- VERIFY RLS IS ENABLED
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('profiles', 'segments', 'runs')
order by tablename;
-- Expected output: all 3 tables have rowsecurity = true

-- VERIFY POLICIES EXIST
select schemaname, tablename, policyname from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'segments', 'runs')
order by tablename, policyname;
-- Expected output: 9 policies total (3 on profiles, 2 on segments, 4 on runs)

-- ============================================================================
-- TEST DATA: Insert a test segment and test queries
-- ============================================================================

-- Insert a test segment (does not require auth)
insert into public.segments (
  id, name, highway, surface, length_m, geom,
  start_lat, start_lng, end_lat, end_lng,
  centre_lat, centre_lng, cell
) values (
  123456789,
  'Test Path',
  'footway',
  'asphalt',
  500,
  '[[51.5, -0.1], [51.501, -0.101], [51.502, -0.102]]'::jsonb,
  51.5, -0.1,
  51.502, -0.102,
  51.501, -0.101,
  '51.50,-0.10'
);
-- Expected: 1 row inserted

-- Verify segment was created
select id, name, length_m from public.segments where id = 123456789;
-- Expected: 123456789, Test Path, 500

-- ============================================================================
-- DERIVED QUERY 1: Runners on a segment today (the pin badge)
-- ============================================================================
-- Note: This will return 0 because we haven't inserted any runs yet.
-- After runs are posted, this query will count them.

select segment_id, count(*) as runners
from public.runs where run_date = current_date
group by segment_id;
-- Expected after runs exist: segment_id, count

-- ============================================================================
-- DERIVED QUERY 2: A segment's board today, by level
-- ============================================================================
-- Requires: auth.uid() context and an actual run, so cannot be fully tested here
-- The structure is correct if the syntax is valid:

select r.seconds, r.level, p.display_name, r.user_id
from public.runs r join public.profiles p on p.id = r.user_id
where r.segment_id = 123456789 and r.run_date = current_date
order by r.seconds asc;
-- Expected: (empty now, will have rows once runs are posted)

-- ============================================================================
-- DERIVED QUERY 3: Most collected, all time
-- ============================================================================

select p.display_name, count(distinct r.segment_id) as collected
from public.runs r join public.profiles p on p.id = r.user_id
group by p.id, p.display_name
order by collected desc limit 100;
-- Expected: (empty now, will have rows once runs are posted)

-- ============================================================================
-- CLEANUP: Remove test data
-- ============================================================================
delete from public.segments where id = 123456789;
-- Expected: 1 row deleted
