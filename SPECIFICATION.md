# Trailblazer — Full Specification

Every screen specced separately. Hand over one section at a time, in the order given.

---

# 0. Read this first

## What exists today
A stopwatch with a map. Sign-in, a daily segment from OpenStreetMap, GPS timing with
line-crossing detection, and a static map image. Everything is in one 1017-line file and
everything persists to `localStorage` on one device.

## What it needs to become
A map-first app. You open it to a live map of your city with segments on it. You can pan
and zoom to scan an area. Each segment shows how many people have run it today. You pick
one, run it, and it becomes yours — a card in a collection that lights up your map.

## The three structural changes
1. **Mapbox GL JS instead of Static Images.** Static images cannot zoom. Everything on the
   map screen depends on this swap.
2. **Segments become a stored pool, not one-per-day.** Today they are discovered live and
   discarded. They must be harvested into the database and kept, so a map can show many at
   once and a collection can persist.
3. **Supabase for identity and data.** Google Sign-In currently produces a user ID that no
   database knows about. Use Supabase Auth's Google provider instead — then `auth.uid()`
   works inside row-level security and every table can be secured properly.

## Build order — do not reorder
| Step | Section | Why this order |
|---|---|---|
| 1 | Data model | Everything writes to it |
| 2 | Auth | Every row needs an owner |
| 3 | Segment harvesting | The map needs something to show |
| 4 | Home map | The centre of the app |
| 5 | Segment sheet | Entry point to a run |
| 6 | Recording | Already mostly built |
| 7 | Result | Currently unreachable |
| 8 | Collection | The retention loop |
| 9 | Boards | Needs runs to exist first |
| 10 | Profile | Small |
| 11 | Alerts | Needs the pool and geofences |

## Rules for whoever builds this
- Split the file. One 1017-line HTML document is why the last two sessions failed.
- Never leave a stub that returns empty. If it is not built, it throws or shows an error.
- Never invent data. No placeholder runners, no fake counts, no simulated GPS.
- Every network call gets a timeout and a visible error state.
- Do not report a task complete without saying what you tested and what the result was.

---

# 1. Data model

## Tables

```sql
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
```

## Security

```sql
alter table public.profiles enable row level security;
alter table public.segments enable row level security;
alter table public.runs     enable row level security;

create policy "read all profiles" on public.profiles
  for select using (true);
create policy "write own profile" on public.profiles
  for insert with check (auth.uid() = id);
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "read segments" on public.segments
  for select using (true);
create policy "signed-in users may add segments" on public.segments
  for insert to authenticated with check (true);

create policy "read all runs" on public.runs
  for select using (true);
create policy "insert own runs" on public.runs
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update own runs" on public.runs
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

This is a real improvement on the current open-write model: a signed-in user can only post
runs as themselves. It is still not launch-grade — nothing stops someone posting an
impossible time for themselves. That is acceptable for a private test and must be fixed
with server-side validation before any public launch.

## Derived data — queries, not tables

**Runners on a segment today** (the pin badge):
```sql
select segment_id, count(*) as runners
from runs where run_date = current_date
group by segment_id;
```

**A segment's board today, by level:**
```sql
select r.seconds, r.level, p.display_name, r.user_id
from runs r join profiles p on p.id = r.user_id
where r.segment_id = $1 and r.run_date = current_date
order by r.seconds asc;
```

**Most collected, all time:**
```sql
select p.display_name, count(distinct r.segment_id) as collected
from runs r join profiles p on p.id = r.user_id
group by p.id, p.display_name
order by collected desc limit 100;
```

**Your collection:**
```sql
select distinct on (segment_id) segment_id, seconds, run_date
from runs where user_id = auth.uid()
order by segment_id, seconds asc;
```

## Acceptance
- All three tables exist with the policies above applied.
- A signed-in user can insert a run for themselves and cannot insert one for another user id.
- Each query above returns correct results against hand-inserted test rows.

---

# 2. Sign in

## Purpose
Get a user to a database identity in one tap.

## Change from today
Google Sign-In currently runs standalone and produces a user id no database knows about.
Replace it with **Supabase Auth using the Google provider**. This is not a cosmetic change —
without it `auth.uid()` is null and no row-level security works.

## Layout
Full-screen, centred. App name. One line: *A new running challenge every day, right near
you.* One button: **Continue with Google**. Below, in small text, links to privacy and terms.

## States
| State | Shows |
|---|---|
| Idle | The button |
| Redirecting | Button disabled, spinner in place of label |
| Returning from Google | Full-screen spinner, "Signing you in…" |
| Error | The actual error text from Supabase, and a retry button |
| Already signed in | Screen never renders; go straight to the map |

## Interactions
- Tap **Continue with Google** → `supabase.auth.signInWithOAuth({ provider: 'google' })`
- On return, if no `profiles` row exists for this user, create one using the Google display
  name, level defaulting to 1, and no home area yet. Then go to area setup.
- If a profile exists with a home area, go straight to the map.

## Acceptance
- Signing in creates exactly one `profiles` row.
- Signing in on a second device with the same Google account reaches the same profile and
  the same run history.
- Closing and reopening the app does not ask you to sign in again.
- Signing out and back in preserves everything.

---

# 3. Area setup

## Purpose
Ask once where the user runs, so the map has somewhere to open and alerts have somewhere to
watch. Currently the app re-detects from GPS on every open and stores nothing.

## Layout
A map centred on the user's detected position, a draggable pin, and a text field
pre-filled with a place name. One button: **This is my area**. A secondary link:
**Use my current location instead**.

## States
| State | Shows |
|---|---|
| Detecting | Spinner, "Finding you…" |
| Detected | Map with pin dropped, editable label |
| Permission denied | The real error, plus a search field so a place can be typed instead |
| Searching | Spinner in the field |
| Saving | Button disabled |

## Interactions
- Drag the pin → the label updates from a reverse geocode.
- Type a place → Mapbox Geocoding API, pick from results.
- **This is my area** → writes `home_lat`, `home_lng`, `home_label` to the profile, then
  triggers a segment harvest around that point, then opens the map.

## Acceptance
- The area survives a reload and a reinstall.
- It is editable later from the profile screen.
- Denying location permission does not block the app — a typed place works.

---

# 4. Home — the map

This is the centre of the app and the biggest single change.

## Purpose
Open to a living map of your city. See what is out there, what is today's challenge, what
you have already claimed, and how many people are running each one.

## Technology
**Mapbox GL JS**, not Static Images. The token belongs in the code, not in localStorage, and
must be URL-restricted in the Mapbox dashboard to the deployed domain.

## Layout
The map fills the screen. Over it:
- **Top left:** your area name, tappable to change.
- **Top right:** a locate button that recentres on you.
- **Bottom:** a horizontal strip of cards, one per visible segment, sorted by distance from
  the map centre. Today's featured segment is first and marked. Swiping the strip pans the
  map to that segment; tapping opens the segment sheet.
- **Bottom bar:** Map · Collection · Boards · You.

## The pins
Every segment in view is a pin. Three visual states, which must be distinguishable without
relying on colour alone:

| State | Appearance |
|---|---|
| Today's featured | Larger pin, filled, a ring around it |
| Open | Standard pin, outlined |
| Collected by you | Standard pin, filled, with a tick |

Each pin carries a badge showing **runners today** from the count query. Zero shows no badge
rather than a zero — an empty board should not be advertised.

## Behaviour
- Pinch and pan freely. No artificial bounds.
- **On map idle**, query segments whose centre falls inside the current viewport, capped at
  200. If fewer than 5 come back, show a **Search this area** button which runs an
  OpenStreetMap harvest for the visible bounds and inserts what it finds.
- Clustering above roughly 50 pins in view.
- Zoom below street level shows counts only, not individual pins.

## States
| State | Shows |
|---|---|
| Loading | Map with a subtle loading bar, no blocking spinner |
| Populated | Pins and the card strip |
| Empty area | "No segments here yet" and a **Search this area** button |
| Harvesting | "Looking for paths and roads…" with a real progress count |
| Offline | Last known pins from cache, an offline banner, recording still available |

## Acceptance
- Pinch-zoom and pan work smoothly on a phone.
- Panning to a new area loads that area's segments without a reload.
- Pin badges match the number of rows in `runs` for that segment today.
- A segment you have run shows as collected immediately after posting.

---

# 5. Segment sheet

## Purpose
Everything needed to decide whether to run this one, and the button that starts it.

## Layout
A bottom sheet over the map, draggable to two heights.

**Collapsed:** name, distance, climb, runners today, and a **Run this** button.

**Expanded, in order:**
1. Name and the street or park it is on
2. Three facts: distance, climb, surface
3. Elevation profile
4. Your target time for your level, and your personal best if you have one
5. Today's board — every runner, fastest first, your row highlighted
6. A level filter above the board
7. All-time best on this segment
8. **Run this**

## States
| State | Shows |
|---|---|
| Loading | Skeleton rows |
| No runs today | "Nobody has run this today. Be first." |
| You have run it today | Your time, your rank, and **Run again** |
| Collected previously | A collected mark and the date you first claimed it |
| Elevation unavailable | The row is omitted entirely, not shown as zero |

## Interactions
- **Run this** → recording screen.
- Tap a leaderboard row → that runner's public profile.
- Swipe down → back to the map.
- Share → an image with the segment name, its shape, and your time.

## Acceptance
- The board matches the database exactly.
- The level filter changes the board without a refetch.
- The sheet opens in under 200 ms from a pin tap.

---

# 6. Recording

Mostly built. What follows is what it must become.

## Purpose
Get the runner to the start, time them accurately, never lose the run.

## States
| State | Screen shows | Transition in |
|---|---|---|
| Acquiring | "Finding you", live accuracy | Screen opens |
| Too inaccurate | "GPS is weak here" and the reading | Accuracy worse than 35 m |
| Go to start | Distance and direction to the start line | 3 consecutive fixes better than 35 m |
| Armed | "Cross the line to start" | Within 30 m of the start |
| Timing | Running clock, live pace, distance remaining | Start line crossed |
| Weak signal | Non-blocking banner, clock continues | Accuracy degrades mid-run |
| Complete | Final time, provisional rank | Finish line crossed |
| Abandoned | Offer to save as untimed | User stops early |
| Posting | Spinner on the button | User taps post |
| Post failed | The real error and **Try again**. Run is kept locally. | Network or database failure |

## Map on this screen
Mapbox GL JS, following the runner, with the segment as a line, the start and finish lines
drawn as actual perpendicular gates, and the live trace behind them. Not a static image.

## Timing rules — keep what exists
- Perpendicular gate lines at each end, 30 m either side of the centreline.
- Crossing detected by line-segment intersection between consecutive fixes.
- Crossing time interpolated between the two fixes.
- Bidirectional: crossing the finish gate first runs the segment in reverse.
- Fixes worse than 35 m accuracy discarded.
- The unused `GATE` constant should be deleted.

## Add
- Screen must stay awake while timing. Use the Wake Lock API.
- Every fix written to local storage as it arrives, so a crash loses nothing.
- A run recorded offline queues and posts when the connection returns.
- Corridor check: if the trace strays more than 40 m from the segment line for more than a
  quarter of its length, mark the run `ranked = false` and say so on the result.

## Acceptance
Test with recorded GPS traces, not by guessing:
- A clean traversal at 3 m/s times within 0.5 s of ground truth.
- A track passing 15 m to the side without crossing the gate does not trigger.
- A reversed traversal produces the same elapsed time.
- Killing the app mid-run and reopening recovers the trace.
- Airplane mode during a run still produces a posted time once reconnected.

---

# 7. Result

Currently unreachable, because the only things that set `myEntry` are two stubs. This must
appear every time a run finishes.

## Purpose
Pay the run off immediately, then push toward tomorrow.

## Layout, in order
1. Your time, large.
2. Rank on today's board for your level, and out of how many.
3. Delta against your level target, and against your own best if you have one.
4. **The collection moment.** If this is the first time you have completed this segment, the
   segment card animates into your collection. This is the emotional payload of the app and
   should be the most considered animation in it.
5. Your split against the leader, if there is one.
6. Share button.
7. **Back to map**.

## States
| State | Shows |
|---|---|
| Posting | Skeleton, time visible immediately |
| Posted, first time on this segment | Full collection animation |
| Posted, run before | "New best" or "Your best stands, by 4s" |
| Unranked | The time, plus why it was not ranked |
| Post failed | Time held locally, **Try again** |

## Acceptance
- The screen appears after every completed run, without exception.
- Rank matches the database.
- Collecting a new segment updates the collection count and lights the pin on the map.

---

# 8. Collection

Not built at all. This is the reason to come back.

## Purpose
Turn completed runs into something that accumulates and can be shown off.

## Layout
Two views, toggled at the top.

**Map view (default):** your city, with every segment you have claimed drawn in and lit,
and unclaimed ones faint. The visual goal is territory filling in over weeks.

**Grid view:** cards, newest first. Each card shows the segment's shape, its name, the date
you first claimed it, your best time, and its rarity.

## Rarity
Calculated from how many people have ever run that segment. Four bands, shown by border
weight and a label, never by colour alone:

| Band | Total runners ever |
|---|---|
| Common | 20 or more |
| Uncommon | 5 to 19 |
| Rare | 2 to 4 |
| First | You are the only one |

## Header stats
Segments collected. Segments available in your area. Percentage claimed. Current streak.

## States
| State | Shows |
|---|---|
| Empty | The map with everything faint, and "Run today's segment to claim your first" |
| Populated | As above |
| Loading | Skeleton grid |

## Acceptance
- A newly collected segment appears without a reload.
- The map view is the same Mapbox GL instance as the home map, styled differently — not a
  second implementation.
- Rarity recalculates as other people run.

---

# 9. Boards

## Purpose
Three different questions, three tabs.

| Tab | Ranks by | Scope |
|---|---|---|
| Today | Time on today's featured segment | Your level, with an all-levels toggle |
| Collectors | Distinct segments ever completed | Your area, with a global toggle |
| Streaks | Consecutive days with a completed run | Your area |

## Row format
Rank, initials avatar, name, the metric, and for Today also the pace. Your own row is
highlighted and pinned into view if you are below the fold.

## States
| State | Shows |
|---|---|
| Empty | "Nobody has run this yet today. Be first." Never a fabricated list. |
| Thin, under 3 runners | The real rows plus your target time as a reference line, clearly labelled as a target and not a person |
| Populated | Up to 100 rows |
| You are not on it | A row at the bottom showing where you would sit |

## Acceptance
- Numbers match the queries in section 1 exactly.
- No fabricated entries under any circumstances.
- Switching level refilters without a refetch.

---

# 10. You

## Purpose
Identity, history, settings, and the legally required controls.

## Layout
1. Name and avatar, editable.
2. Four stats: segments collected, runs, total distance, current streak.
3. Level, with an explanation of what it changes and a control to change it.
4. Run history, newest first, tapping through to the segment.
5. Settings: home area, notifications, units.
6. Sign out.
7. **Delete account.**

## Delete account
Required by Apple if this ever reaches the App Store, and by GDPR regardless. Must delete
the auth user, the profile, and all runs. Two-step confirmation. Not a support email —
an in-app action that completes.

## Acceptance
- Editing the name updates it everywhere it appears, including past leaderboard rows.
- Deleting the account removes every row and signs the user out.

---

# 11. Alerts

Build last. Needs the segment pool and a stored home area.

## What fires
| Trigger | Message | Timing |
|---|---|---|
| Daily segment live | "Today's segment is live in [area]" | User-set, default 08:00 local |
| Streak at risk | "Your 6-day streak ends at midnight" | 19:00, only if unrun and a streak exists |
| Near an uncollected segment | "[Name] is 200 m away, and you haven't claimed it" | Geofence, maximum once per day |
| Someone beat your time | "[Name] took your time on [segment]" | Immediate, opt-in, off by default |

## Rules
- Never more than two per day.
- Every type individually switchable.
- Ask for notification permission after the first completed run, never on first open.
- The geofence alert needs background location, which triggers extra review on both app
  stores. Ship without it and add it later.

## Acceptance
- Turning a type off stops it.
- No user receives more than two in a day.
- Tapping any notification opens the relevant segment sheet, not the home screen.

---

# 12. What is explicitly not in this version

Friends and following. Clubs. Private leaderboards. Apple Watch. HealthKit or Health
Connect. Strava export. Subscriptions. Hand-curated segments. Route drawing. Anything
social beyond a shared public board.

All of these are reasonable later. None of them matter until the loop above works and
people come back on day two.
