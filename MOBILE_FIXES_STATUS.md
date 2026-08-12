# Mobile Fixes Status

## APPLIED ✅

### New Files Created
1. **lib/tap.js** — Converts touch→click for all 15 existing click handlers
2. **lib/mobile.css** — Safe-area insets, 100dvh, 44px tap targets, error bar styling
3. **lib/errors.js** — All Supabase errors display visibly on screen (no silent failures)

### EDIT 1 — Viewport + Script Tags (5/8 pages complete)
Applied to: `index.html`, `home-map.html`, `area-setup.html`, `recording.html`, `result.html`
- ✅ Viewport meta: `width=device-width,initial-scale=1,viewport-fit=cover`
- ✅ Added mobile.css link
- ✅ Added tap.js and errors.js scripts (first, before others)

Still needed: `collection.html`, `boards.html`, `profile.html`

### EDIT 2 — 100vh → 100dvh ✅
- `area-setup.html`: Replaced both occurrences
- Fixes button push-off under mobile browser chrome

### EDIT 3 — Prevent Map Blank ✅ (partial)
- Added `resizeMap()` function to `home-map.html`
- Wired up: `orientationchange`, `resize`, `visualViewport.resize` events
- Still needed: Replace `display:none` on map with `classList.add('is-hidden')`

### EDIT 5 — Distance Formatting ✅
- `lib/utils.js`: Added `fmtLength(metres)` and `fmtDistanceAway(metres)`
- Prevents "1.2 km" + distance-away confusion

---

## REMAINING ⏳

### EDIT 1 — Complete Script Tags (3 pages)
```html
<!-- In each of: collection.html, boards.html, profile.html
     Add after fonts.googleapis link:
-->
<link rel="stylesheet" href="/lib/mobile.css">

<!-- As first scripts in each file:
-->
<script src="/lib/tap.js"></script>
<script src="/lib/errors.js"></script>
```

### EDIT 3 — Replace display:none on Map/Sheet
Find where map container is hidden when sheet opens. Replace:
```js
// OLD: mapEl.style.display = 'none';
// NEW:
mapEl.classList.add('is-hidden');
// When closing: mapEl.classList.remove('is-hidden');
```

### EDIT 4 — Fix Segment Loading
Current issue: `map.on('idle')` unreliable → 0 markers/cards after 8 sec.

Replace segment loading with:
```js
let loadingSegments = false;
async function loadSegmentsInView() {
  if (loadingSegments) return;
  loadingSegments = true;
  // ... query + render ...
  loadingSegments = false;
}
map.on('load',    () => { resizeMap(); loadSegmentsInView(); });
map.on('moveend', () => loadSegmentsInView());
setTimeout(() => { resizeMap(); loadSegmentsInView(); }, 2500);
```

### EDIT 6 — Click Listeners (optional)
`tap.js` handles all click events now. Verify working on:
- result.html: tabs, buttons
- boards.html: tabs
- profile.html: settings, delete account, etc.

---

## Testing Checklist (390×844, touch emulation)

After applying remaining edits, test each page:

1. **Tap response** — Do cards, pins, tabs respond to touch?
2. **Safe area** — Bottom bar below home indicator?
3. **Map survival** — Open/close sheet without blank map?
4. **Segment load** — 10 sec page load, how many markers + cards?
5. **Loading bar** — Does it clear?

---

## Live Site
https://trailblazer-khn2.vercel.app (auto-deploys from `main`)
