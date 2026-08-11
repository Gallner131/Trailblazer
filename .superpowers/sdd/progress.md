# SDD ledger — plan: /Users/georgeallner/Trailblazer/docs/superpowers/plans/2026-08-11-sections-3-4-5.md

## Tasks

- [x] Task 1: Create lib/constants.js (BLOCKED: needs real Mapbox token)
- [x] Task 2: Create lib/utils.js
- [x] Task 3: Create lib/api.js
- [ ] Task 4: Create lib/harvest.js
- [ ] Task 5: Create section-3-area-setup.html
- [ ] Task 6: Create section-4-home-map.html
- [ ] Task 7: Create section-5-segment-sheet.html


---

## Task 1: Create lib/constants.js

**Status:** Complete (commits 152e663..362e9fa)

- Created `/Users/georgeallner/Trailblazer/lib/constants.js` with all app-wide constants
- Supabase URL and key (production values)
- Timeout configuration (API 5s, geocode 5s, Overpass 30s, location 10s)
- API endpoints (Overpass, Mapbox Geocoding)
- Exports to `window.AppConstants`
- Mapbox token obtained and committed

**Review:** Spec ✅ — all requirements met. File structure correct, exports proper. Token in place.


---

## Task 2: Create lib/utils.js

**Status:** Complete (commit b253db4)

- Created `/Users/georgeallner/Trailblazer/lib/utils.js` with all geometry and formatting functions
- Haversine: Verified against critical test values (69.2 m and 111.2 m)
- Polyline encode/decode: Exact match with Google's canonical test vector
- All formatting functions tested and working
- Exported to `window.AppUtils`

**Review:** Spec ✅ — all critical tests pass. Code correct and complete.


---

## Task 3: Create lib/api.js

**Status:** Complete (commit 0a51e4d)

- Created `/Users/georgeallner/Trailblazer/lib/api.js` with all Supabase and Mapbox wrappers
- Timeout protection on all network calls (5s API, 5s geocode)
- 10 API methods implemented with proper error handling
- All methods return `{ data, error }` tuple pattern
- Supabase CRUD: profiles, segments, runs queries
- Mapbox geocoding: forward and reverse lookup
- Exported to `window.AppAPI`

**Review:** Spec ✅ — all methods defined and structurally verified. Timeout wrapper tested (success and timeout cases). Ready for browser testing on deployed URL.

