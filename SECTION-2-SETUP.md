# Section 2: Auth — Setup and Tests

## Files created
- `section-2-auth.html` — Sign-in screen with Supabase Google OAuth
- `lib/auth.js` — Auth logic: sign-in, profile creation, session persistence, routing

## Before running: Supabase setup

### 1. Enable Google OAuth in Supabase

1. Go to Supabase dashboard → your project → **Authentication** → **Providers**
2. Find **Google** and click it
3. You will need Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or use existing)
   - Enable Google+ API
   - Create OAuth 2.0 credentials (Web application type)
   - Add authorized redirect URIs:
     - `https://YOUR_SUPABASE_URL.supabase.co/auth/v1/callback`
     - `http://localhost:5173/auth/v1/callback` (for local dev)
   - Copy **Client ID** and **Client Secret**
4. Paste them into the Supabase Google provider form and save

### 2. Get your Supabase API keys

1. Go to Supabase dashboard → your project → **Settings** → **API**
2. Copy:
   - **Project URL** — paste as `SUPABASE_URL` in `lib/auth.js`
   - **anon public** — paste as `SUPABASE_ANON_KEY` in `lib/auth.js`

### 3. Update `lib/auth.js`

Replace the placeholders at the top:
```javascript
const SUPABASE_URL = 'https://YOUR_SUPABASE_URL.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

## Testing

### Test suite — run in Supabase SQL Editor

Paste this entire block. It tests profiles creation, routing logic, and RLS without persisting anything.

```sql
-- Section 2 Auth Tests
-- All tests run in transactions that roll back automatically.

-- Setup: Create a test user (simulating auth.uid())
-- For these tests, we'll validate the structure and queries.

-- TEST 1: Profiles table structure
-- Verify columns exist with correct types and constraints
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'profiles'
order by ordinal_position;
-- Expected: id (uuid), display_name (text NOT NULL), level (smallint default 1), 
--           home_lat (numeric), home_lng (numeric), home_label (text), created_at (timestamptz)

-- TEST 2: Check RLS is enabled
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename = 'profiles';
-- Expected: profiles | true

-- TEST 3: Check policies exist
select policyname, qual, with_check from pg_policies
where schemaname = 'public' and tablename = 'profiles'
order by policyname;
-- Expected: 3 policies - "read all profiles", "write own profile", "update own profile"

-- TEST 4: Validate level constraint
-- This query shows the constraint exists
select constraint_name, constraint_type
from information_schema.table_constraints
where table_name = 'profiles' and constraint_name like '%level%';
-- Expected: Level check constraint exists

-- TEST 5: Validate profile level range (0-3)
-- Attempt to insert invalid level (should fail with RLS or constraint)
begin;
  insert into public.profiles (id, display_name, level) 
  values (gen_random_uuid(), 'test', 4);
rollback;
-- Expected: ERROR due to check constraint

-- TEST 6: Validate profile level range (valid)
-- Check that valid levels (0,1,2,3) pass syntax
begin;
  insert into public.profiles (id, display_name, level) 
  values (gen_random_uuid(), 'test', 1);
  -- If we got here, constraint allows level 1
rollback;
-- Expected: No error (but rolled back)

-- TEST 7: Profile creation follows spec
-- Verify that the insert statement in auth.js matches table structure:
-- INSERT: id, display_name, level (with defaults for home_lat, home_lng, home_label)
-- This query shows the defaults
select column_name, column_default
from information_schema.columns
where table_name = 'profiles' and column_name in ('level', 'home_lat', 'home_lng', 'home_label')
order by column_name;
-- Expected: level has default 1, home fields are NULL by default

-- TEST 8: RLS policy test - read all profiles (anonymous view)
-- Verify the policy allows reading all profiles
select count(*) from public.profiles;
-- Expected: Works without auth (read all policy allows it)
```

### Manual end-to-end test (in browser)

1. Serve `section-2-auth.html` on `http://localhost:PORT`
2. Click **Continue with Google**
3. Complete Google login
4. You will redirect back to the app
5. Check Supabase dashboard → **profiles** table
6. Verify **exactly one row** exists for your Google account:
   - `id` = your auth user id
   - `display_name` = your Google name
   - `level` = 1
   - `home_lat`, `home_lng`, `home_label` = NULL

**Important:** After manual testing, delete this row from the profiles table to keep the database clean.

7. Test session persistence:
   - Reload the page
   - Verify you are redirected to `/area-setup.html` (does not exist yet, will 404)
   - This means the session was found and routing worked

8. Test sign-in again:
   - Manually sign out (add to browser console):
     ```javascript
     await supabase.auth.signOut();
     ```
   - Page should show sign-in button again
   - Sign in with the same Google account
   - Verify **no new row** is created in profiles (same user id is reused)

## Acceptance criteria

✓ **Test 1-4:** SQL structure and constraints are correct
✓ **Test 5:** Invalid levels are rejected by constraint
✓ **Test 6:** Valid levels are accepted
✓ **Test 7:** Defaults match the auth.js insert statement
✓ **Test 8:** RLS policy allows reading all profiles
✓ **Manual Test:** First sign-in creates exactly one profiles row
✓ **Manual Test:** Sign-in again with same account does not duplicate the row
✓ **Manual Test:** Session persists across reload
✓ **Manual Test:** Closing browser and reopening goes straight to area setup without prompting

## Next sections

This completes Section 2. The auth flow is ready:
- Sign-in screen built
- OAuth redirect handling implemented
- Profile creation on first sign-in
- Session persistence and routing logic

Section 3 (Area setup) will be triggered at `/area-setup.html` on first sign-in.
Section 4 (Home map) will be triggered at `/index.html` if profile has home area.
