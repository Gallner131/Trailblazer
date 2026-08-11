# CLAUDE.md

Read this before doing anything. It applies to every session.

## The one rule

**Diagnose before you change.** Read the actual file. Fetch the actual deployed page. Run
the actual query. Do not theorise about a cause and then act on the theory.

A real failure from this project: the sign-in button did nothing. The first fix was a guess
about script loading — it did not work. The second attempt actually read the file, found
that the Supabase CDN already defines a global called `supabase` and the code redeclared it,
and fixed it in one line. The guess cost an hour. Reading the file took two minutes.

## Never

- **Never invent data.** No placeholder names, no fake leaderboard entries, no simulated GPS,
  no made-up counts. If a data source fails, show the real error. An empty leaderboard is
  correct. This has already happened once on this project and it was the worst thing in it.
- **Never invent credentials, IDs, or keys.** If you do not have a value, say so. Do not
  write a plausible-looking placeholder into a report as though it were real.
- **Never leave a stub that returns empty.** `loadBoard()` returning `[]` and `postTime()`
  logging to console made the app look finished while doing nothing, and the result screen
  became unreachable for weeks. If a thing is not built, it throws or shows an error.
- **Never write test rows into the live database.** Use a transaction that rolls back.
- **Never say "should work" or "100% this will work".** Say what you ran and what it output.
- **Never report a task complete without stating what you tested and what the result was.**

## Always

- **State the actual cause before proposing a fix.** One sentence: what is wrong and how you
  know.
- **Check your own output.** If you produce a page, fetch it. If you produce SQL, run it. If
  you produce a function, call it with a known input and compare against a known answer.
- **Use real values, not placeholders.** The project's Supabase URL, keys, and Mapbox token
  are already in the codebase. Never write `YOUR_SUPABASE_URL`.
- **Commit and push.** Files written locally and not pushed do not exist. This has already
  wasted time on this project.
- **One section at a time.** SPEC.md defines the build order. Do not work ahead.
- **Every page gets** `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`.
  Without it the page is unusable on a phone — taps register as zoom. This app is used on a
  phone while running.
- **Every network call gets a timeout and a visible error state.** A spinner that never
  resolves is a bug.

## Instructions for the user

He is not a developer and does not want to be one. When something needs doing by hand:

- One step at a time. Do not give a list of ten.
- Name the exact button and where it is on screen.
- Say what he should see when it has worked.
- Never say "just" or "simply".
- Never tell him to run a local server. The project deploys to Vercel from GitHub — push and
  test on the real URL.
- Never ask for database connection strings or secrets. Write SQL to a file for him to paste.

## Project facts

| Thing | Value |
|---|---|
| Deployed | `https://trailblazer-khn2.vercel.app` (Vercel, auto-deploys from `main`) |
| Supabase | `https://ttrhmwjnegnbnovnwlzo.supabase.co` |
| Supabase key | `sb_publishable_...` — **new format**, not the old `eyJ...` JWT |
| Auth | Supabase Auth, Google provider. Not standalone Google Sign-In. |
| Segments | OpenStreetMap Overpass API, stored in the `segments` table |
| Elevation | opentopodata.org SRTM 30 m, cached per segment |
| Maps | Mapbox. Static Images today; Mapbox GL JS per SPEC.md section 4 |
| Spec | `SPEC.md` — 11 sections, build in order |

## Things already established — do not re-derive or regress

- Haversine returns 69.2 m for 0.001° longitude at 51.5°N and 111.2 m for 0.001° latitude.
  Both verified correct.
- The polyline encoder matches Google's canonical test vector:
  `[[38.5,-120.2],[40.7,-120.95],[43.252,-126.453]]` → `` _p~iF~ps|U_ulLnnqC_mqNvxq`@ ``
- Web Mercator at 512 px tiles: 100 m = 134.5 px at zoom 16 at 51.5°N. This is the Mapbox
  convention.
- Elevation must be smoothed with a 3-point moving average before differencing. SRTM is 30 m
  data used on sub-100 m features; unsmoothed, sampling noise reads as climbing.
- GPS fixes worse than 35 m accuracy are discarded.
- Timing uses perpendicular gate lines with interpolation between fixes, not proximity
  radius, and works in both directions.

## Strava

Do not integrate the Strava API for segments, leaderboards, or timing. Their API Agreement
prohibits applications that enable virtual races or competitions or that replicate Strava
functionality, and defines segment and leaderboard data as their property. This is settled —
do not revisit it.
