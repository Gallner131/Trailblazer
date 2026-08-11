# Section 2: Auth — Setup Instructions

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

## Running locally (development)

1. Serve the app on `http://localhost:5173` (or your preferred port)
   - If using Live Server in VS Code, that's the default
   - If using `python -m http.server 8000`, navigate to `http://localhost:8000/section-2-auth.html`

2. Click **Continue with Google**

3. You will be redirected to Google login, then back to the app

4. Check the result:
   - If first sign-in: a `profiles` row is created, then redirect to `/area-setup.html` (which doesn't exist yet; you'll see 404)
   - If already signed in (second device): redirect to `/index.html` if profile has home area, else `/area-setup.html`

## Testing acceptance criteria

### Test 1: Signing in creates exactly one profiles row

1. Sign in with a new Google account
2. In Supabase dashboard → **profiles** table, verify:
   - Exactly one row exists for this user
   - `display_name` is the user's Google name
   - `level` is 1
   - `home_lat`, `home_lng`, `home_label` are null

**Expected:** ✓ One row, correct data

### Test 2: Second device reaches the same profile

1. Sign in with the same Google account on a different browser/device
2. Verify the same `profiles` row is retrieved (not duplicated)
3. No new row is created

**Expected:** ✓ Same profile, no duplicates

### Test 3: Closing and reopening doesn't ask to sign in again

1. Sign in
2. Close the tab
3. Open a new tab to `section-2-auth.html`
4. Verify you are immediately redirected to area setup (or map if profile has home area)
5. Sign-in screen should not show

**Expected:** ✓ Automatic redirect, no sign-in prompt

### Test 4: Sign out and back in preserves everything

1. Sign in and create a profile (see Test 1)
2. Sign out: add a sign-out button to `section-2-auth.html` or manually clear session in browser dev tools
   ```javascript
   await supabase.auth.signOut();
   ```
3. Sign-in screen appears
4. Sign in again with the same Google account
5. Verify the same `profiles` row is reached (no duplicate created)

**Expected:** ✓ Profile preserved, no new rows

## Known limitations

- Sign-out is not implemented in `section-2-auth.html` yet (will be in Section 10: You)
- Area setup screen (`area-setup.html`) does not exist yet (Section 3)
- Map screen (`index.html`) does not exist yet (Section 4)
- Redirects will 404 until those sections are built

## Security note

- The `section-2-auth.html` script loads Supabase JS from CDN. Add SRI hashes before deploying to production:
  ```html
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" 
          integrity="sha384-..." 
          crossorigin="anonymous"></script>
  ```
- Get the hash from [jsDelivr SRI Hash Calculator](https://www.jsdelivr.com/package/npm/@supabase/supabase-js)
