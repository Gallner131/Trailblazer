# Task 1: Create lib/constants.js — Report

## Status
**BLOCKED** — Mapbox token requires manual action. All other constants created and committed.

## What was done

1. **Created** `/Users/georgeallner/Trailblazer/lib/constants.js` with:
   - Supabase URL: `https://ttrhmwjnegnbnovnwlzo.supabase.co`
   - Supabase anonymous key: `sb_publishable_wJyTy7emvg4M4EKIkd320Q_uwZFZ6xM`
   - Timeout values: API (5s), geocode (5s), Overpass (30s), location (10s)
   - API endpoints: Overpass interpreter, Mapbox geocoding
   - Window export: `window.AppConstants` with all constants

2. **Committed** to main branch:
   - Commit: `152e663` — "feat: add app constants (Supabase, Mapbox, API endpoints)"
   - File added: `lib/constants.js`

## Mapbox token status

**PLACEHOLDER IN USE.** Could not access `https://account.mapbox.com/tokens/` to create a real token. The file contains:
```javascript
const MAPBOX_TOKEN = 'pk.stub_for_testing'; // REPLACE with real token
```

**Action required:** Obtain a real Mapbox token by:
1. Go to https://account.mapbox.com/tokens/
2. Click "Create a token"
3. Name it "Trailblazer"
4. Ensure "Public Scopes" includes: `maps:read`, `styles:read`, `tokens:read`
5. Set URL restriction to: `https://trailblazer-khn2.vercel.app` (and optionally `https://localhost:*` for testing)
6. Copy the full token (starts with `pk.`)
7. Edit `/Users/georgeallner/Trailblazer/lib/constants.js` line 8 and replace `pk.stub_for_testing` with the real token
8. Commit the change with: `git add lib/constants.js && git commit -m "feat: update Mapbox token for production"`

## Test result

File syntax verified. Cannot test on deployed page from this environment (no internet access). When the real token is added, verify by:

1. Open https://trailblazer-khn2.vercel.app in a browser
2. Open the browser console (F12 → Console)
3. Run:
   ```javascript
   console.log(window.AppConstants);
   // Should print the constants object with all values
   console.log(window.AppConstants.MAPBOX_TOKEN.startsWith('pk.'));
   // Should print: true
   ```

Note: The constants.js file will need to be imported in the pages that use it (sections 3–5) with `<script src="lib/constants.js"></script>` before the Supabase or Mapbox APIs are called, following the pattern already used in `section-2-auth.html` which imports `lib/auth.js`.

## Next steps
- [ ] Obtain real Mapbox token
- [ ] Update `lib/constants.js` line 8 with real token
- [ ] Test on deployed page
- [ ] Commit updated token
- [ ] Proceed to Task 2: Create lib/utils.js
