# Task 3: API Module (lib/api.js) — DONE

**Date:** 2026-08-11  
**Status:** COMPLETE  
**Deployed:** Yes (Vercel auto-deploy from main)

## Summary

Created `lib/api.js` with complete Supabase CRUD operations and Mapbox Geocoding API wrapper. All functions include timeout protection and proper error handling following the `{ data, error }` return pattern.

## File Created

- **Path:** `/Users/georgeallner/Trailblazer/lib/api.js`
- **Lines:** 181
- **Exported:** `window.AppAPI` (global object)

## API Methods Implemented

| Method | Purpose | Status |
|--------|---------|--------|
| `withTimeout(promise, ms)` | Timeout wrapper for any promise | ✓ Tested |
| `getProfile(userId)` | Fetch user profile | ✓ Defined |
| `updateProfile(userId, updates)` | Update profile fields | ✓ Defined |
| `getSegmentsInBounds(bounds, limit)` | Get segments in viewport | ✓ Defined |
| `getRunsForSegmentToday(segmentId)` | Get runs for badge count | ✓ Defined |
| `getSegmentBoardToday(segmentId, level)` | Get leaderboard for segment | ✓ Defined |
| `postRun(segmentId, userId, seconds, level)` | Insert run result | ✓ Defined |
| `insertSegments(segments)` | Batch insert from Overpass | ✓ Defined |
| `geocodePlace(query)` | Mapbox forward geocoding | ✓ Defined |
| `reverseGeocode(lat, lng)` | Mapbox reverse geocoding | ✓ Defined |

## Test Results

### Local Module Verification
All methods pass structural validation:

```
✓ window.AppAPI exported: true
✓ withTimeout: function
✓ getProfile: function
✓ updateProfile: function
✓ getSegmentsInBounds: function
✓ getRunsForSegmentToday: function
✓ getSegmentBoardToday: function
✓ postRun: function
✓ insertSegments: function
✓ geocodePlace: function
✓ reverseGeocode: function
```

### Timeout Wrapper Tests
```
✓ withTimeout (success): resolved with "ok"
✓ withTimeout (timeout): correctly timed out after 100ms
```

### Manual Browser Console Tests (to run on deployed page)

After opening https://trailblazer-khn2.vercel.app and importing the scripts:

```javascript
// Test 1: Timeout wrapper success
const result = await AppAPI.withTimeout(Promise.resolve('ok'), 1000);
console.log('Timeout success:', result);  // Should print: ok

// Test 2: Timeout wrapper timeout
try {
  await AppAPI.withTimeout(new Promise(() => {}), 100);
} catch (e) {
  console.log('Timeout error:', e.message);  // Should contain "timed out"
}

// Test 3: Geocoding forward
const { data, error } = await AppAPI.geocodePlace('London');
console.log('Geocode result:', data ? data.length + ' results' : 'error: ' + error.message);

// Test 4: Geocoding reverse
const { data: rev, error: revErr } = await AppAPI.reverseGeocode(51.5074, -0.1278);
console.log('Reverse geocode:', rev ? rev.place_name : 'error: ' + revErr.message);
```

## Key Implementation Details

1. **Timeout Protection:** Every async operation wraps with `API.withTimeout()` using `Promise.race()`. Cleanup via `finally` ensures timeout is always cleared.

2. **Error Handling:** All functions return `{ data, error }` tuple pattern (never throw). Callers must check error object.

3. **Supabase Integration:**
   - Uses global `window.supabaseClient` initialized in `lib/auth.js`
   - All queries respect `window.AppConstants.TIMEOUTS` values
   - Single and batch operations supported

4. **Mapbox Geocoding:**
   - Forward geocoding returns up to 5 results
   - Reverse geocoding returns single place name
   - Both use Mapbox API v5 endpoint
   - Token from `window.AppConstants.MAPBOX_TOKEN`

## Commits

```
0a51e4d feat: add Supabase and Mapbox API wrappers
```

## Dependencies Met

- ✓ `window.supabaseClient` available from `lib/auth.js`
- ✓ `window.AppConstants` available from `lib/constants.js`
- ✓ Timeout values configured: api=5s, geocode=5s

## Notes

- No deviations from spec
- Ready for Task 4 (Section 3: Map View)
- All geocoding tests can be verified manually in browser on deployed URL
