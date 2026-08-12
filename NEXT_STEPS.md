# Trailblazer — Next Steps (User Action Required)

**Current Status:** All code is built. Database schema is incomplete. App cannot run without these steps.

---

## CRITICAL PATH TO WORKING APP

### Step 1: Apply Database Schema (5 min)

1. Go to **https://ttrhmwjnegnbnovnwlzo.supabase.co** (Supabase dashboard)
2. Click **SQL Editor** on the left
3. Click **+ New query**
4. Copy **ALL** of `/Users/georgeallner/Trailblazer/schema-fix.sql` (the whole file)
5. Paste it into the editor
6. Click **Run** (or press Cmd/Ctrl+Enter)
7. Wait for ✓ success

**What this does:** Adds missing columns to existing tables:
- `segments.quality` (0-100 score)
- `segments.hidden` (for reporting)
- `profiles.units` (metric/imperial)
- `runs.featured` (streak tracking)
- `runs.unranked_reason` (why a run didn't rank)
- Creates `segment_reports` table

**If you see errors:** They're expected. The "if not exists" clauses skip existing columns.

---

### Step 2: Clean Up Bad Segment Data (2 min)

1. In the same SQL Editor, click **+ New query**
2. Copy **ALL** of `/Users/georgeallner/Trailblazer/cleanup.sql`
3. Paste it and click **Run**

**What this does:**
- Deletes junk test rows (id 999999901)
- Deletes all segments under 300 m (below spec minimum)
- Adds length constraint so future segments can't be invalid

**Output:** Should say "0 rows" for the deletions (the 380 old segments will be removed).

---

### Step 3: Harvest Real Segments (30 sec to 2 min)

1. Open **https://trailblazer-khn2.vercel.app** on your phone (or browser)
2. Sign in with Google
3. **Set your home area** (click area chip on home screen)
4. Find your current location or search for a London street
5. Tap **This is my area**
6. **Wait for harvest to complete** — you'll see:
   ```
   Found 2,673 paths, filtering...
   Saved 100 of 380 segments...
   ```
7. When done, you'll see a featured segment card on the home screen

**Result:** 100-400 segments loaded into your area, all 300–1000 m, with quality scores.

---

### Step 4: Test the Definition of Done (§0) Flow (5 min)

On your phone, run through this exact sequence:

1. **Sign in:** Tap "Continue with Google" → allow → signed in ✓
2. **See featured card:** Card shows name, distance (300+ m), climb, target time, "Run this" button ✓
3. **Tap Run this:** Goes to recording screen, shows segment name at top ✓
4. **Recording starts:** Allows location, shows GPS accuracy ✓
5. **Simulate run:** Walk or drive start to finish of the segment
   - When you approach start: "Ready to run" appears
   - Cross start line: clock starts "Running"
   - Cross finish line: time stops, shows "Finished"
6. **Post run:** Tap the "Post" button
7. **See result:** Your time appears, rank on board shows, collection animation plays ✓
8. **Check table:** Go back to home, map now shows runner count on this segment ✓
9. **Check collection:** Tap Collection tab → segment appears in grid ✓
10. **Check boards:** Tap Boards → your run appears in today's leaderboard ✓

**If any step fails:** Look at the error message on screen (all errors now display visibly). Report what it says.

---

## Troubleshooting

### "No segments in your area"
- Must be in **London** (spec §2.2)
- Try searching "Regent Street, London" to set location
- Tap "Search this area" button to re-harvest

### Recording shows "GPS weak"
- Needs to be outdoors with clear sky
- Accuracy must improve to < 35 m
- Give it 10–15 seconds

### Time doesn't post
- Check browser console (F12) for error
- Most likely cause: schema wasn't applied fully
- Go back to Step 1 and verify all queries ran

### Run doesn't appear in runs table
- Schema must be applied (Step 1)
- Segment must have `approved = true` in database (should be by default)

---

## Files You Pasted

- `schema-fix.sql` — database migrations
- `cleanup.sql` — remove bad segment data
- Both get pasted into Supabase SQL Editor, not anywhere else

---

## Files That Changed in Code

- `lib/auth.js` — routing guard fixed
- `home-map.html` — featured card, error displays
- `recording.html` — GPS timing engine, error handling
- `result.html` — time/rank display
- `collection.html` — claimed segments grid
- `boards.html` — leaderboards
- All auto-deployed to https://trailblazer-khn2.vercel.app

---

## After You Test

Once Definition of Done (§0) passes all 10 steps, reply with what you saw at each step. Then we move to:
- §5: Segment pool cleanup and quality scoring
- §6–§26: Remaining features (collection map, streaks, notifications, etc.)
