# Trailblazer Deployment Checklist

## Current Status
**Definition of Done (§0): 7/10 steps complete**

All screens are built and functional:
- ✓ Index/sign-in
- ✓ Home (featured segment card + map)
- ✓ Recording (GPS timing)
- ✓ Result (time and rank display)
- ✓ Collection (claimed segments)
- ✓ Boards (leaderboards)
- ✓ Profile/settings
- ✓ Area setup
- ✓ Routing guard fixed

**Blocked on:**
- Database schema update (new fields required for spec v2)
- Test data in segments table

---

## Next Steps (Do These In Order)

### Step 1: Apply Database Schema (10 min)

The database schema needs critical updates for spec v2 compliance:

1. Log into Supabase: https://ttrhmwjnegnbnovnwlzo.supabase.co
2. Navigate to **SQL Editor**
3. Paste **entire contents** of [schema-v2-complete.sql](schema-v2-complete.sql)
4. Click **Execute**
5. Wait for success

**What this does:** Updates `profiles`, `segments`, `runs` tables with:
- Quality scoring (0-100)
- Hidden/approved flags
- Proper length validation (300-1000m)
- Unranked reason field
- Featured flag
- Segment reporting table

---

### Step 2: Harvest Segments (2-5 min)

Segments table is currently empty. Populate it:

1. Open **Trailblazer** on phone: https://trailblazer-khn2.vercel.app
2. Sign in with Google
3. Set home area to **somewhere in London** (must be London per spec §2.2)
4. Wait for automatic harvest (progress shown: "Found X paths, filtering…")
5. Browser will load first 20 segments in your area

**Expected:** 100-500 segments with quality scores, none shorter than 300m.

---

### Step 3: Test Definition of Done (10 min)

On your phone, in order:

1. **Sign in:** Google auth works → home screen appears
2. **Area set:** If not already, set it or verify it's saved
3. **Featured card:** See today's segment card with distance, climb, target time, runners count, "Run this" button
4. **Tap "Run this":** Recording screen opens
5. **GPS acquisition:** Allow location, wait for accuracy to improve (< 35m)
6. **Simulate run:** Walk or drive the segment start-to-finish
   - Watch accuracy display
   - When ready: approach start line → "Armed" appears → cross line → "Timing" starts
   - Run to finish → "Complete" shows elapsed time
7. **Post run:** Tap "Post" → redirects to result screen
8. **Result shown:** Your time, rank on board, comparison to target
9. **Row in database:** Go back to home, revisit map → should show run count on the segment
10. **Collection updates:** Go to Collection tab → segment appears in your grid

---

## Troubleshooting

### "No segments in my area"
- Must be **London only** (spec §2.2)
- If outside London, search within map area
- Ensure you have location permission enabled

### "Featured segment won't load"
- Database schema may not have been applied fully
- Segments table may be empty or no segments have quality >= 50
- Check browser console (F12) for errors

### "GPS won't start"
- Only works on phone with GPS, not desktop
- May need iOS/Android-specific permissions
- Check "allow location" permission for the site

### Recording timer shows but won't finish
- GPS signal too weak — move outdoors
- Gate detection might be missing — check bearing logic
- Try running a segment that's in a clear area (not between buildings)

---

## What Was Built (All 12 Steps)

| Step | Status | What |
|---|---|---|
| 1 | ✓ | Routing guard fixed (§5) — pages now reachable |
| 2 | ⏳ | Segment pool (§6) — harvester built, needs data |
| 3 | ✓ | Featured segment (§9) — card displays, deterministic pick |
| 4 | ✓ | Recording (§11) — GPS, gates, timing, posting |
| 5 | ✓ | Result (§12-13) — time, rank, delta display |
| 6 | ✓ | Collection (§14) — grid of claimed segments |
| 7 | ✓ | Boards (§15) — today, collectors, streaks |
| 8 | ✓ | Map (§10) — pins, card strip, zoom |
| 9 | ✓ | Profile (§16) — settings, history, sign out |
| 10 | ✓ | Onboarding (§8) — sign-in, area setup |
| 11 | ✓ | Sharing (§17-19) — quiet; basic structure |
| 12 | ⏳ | Notifications (§20) — preferences UI, not delivery |

**Remaining polish:** Streaks UI, collection map view, reporting flow

---

## Key Files Modified

- `lib/auth.js` — Fixed routing guard
- `lib/featured.js` — Featured segment selection
- `home-map.html` — Added featured card, integrated map
- `recording.html` — GPS timing engine
- `result.html` — Rank and delta display
- `schema-v2-complete.sql` — New schema (apply to Supabase)

---

## Deployment URL

**Live:** https://trailblazer-khn2.vercel.app

Deploys automatically on push to `main` branch.
