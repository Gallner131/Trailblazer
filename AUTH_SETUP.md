# Supabase Auth Setup for Daily Segment

## Overview
This document describes the authentication setup for Daily Segment using Supabase Auth.

## Authentication Methods
- **Email Magic Link** — passwordless sign-in via email
- **Google OAuth** — sign in with Google account
- **Apple Sign In** — sign in with Apple ID

## Database Schema
Run `supabase-schema.sql` in the Supabase dashboard SQL editor to set up:
- `public.profiles` — user profiles with level and location
- `public.runs` — leaderboard entries (RLS enabled)
- `public.segments` — approved segments (read-only)
- `public.segment_elevation` — cached elevation data
- `public.collections` — user segment collections
- `public.streaks` — streak tracking
- `public.daily_segments` — materialized segment-of-the-day

## Supabase Configuration Steps

### 1. Enable Providers
In Supabase dashboard → Authentication → Providers:
- **Email**: Already enabled by default
- **Google**: Configure OAuth credentials
  - Go to https://console.cloud.google.com/
  - Create OAuth 2.0 credentials (Web application)
  - Add redirect URI: `https://[your-project].supabase.co/auth/v1/callback`
- **Apple**: Configure OAuth credentials
  - Go to https://developer.apple.com/account/
  - Create Sign in with Apple configuration
  - Add redirect URI: same as above

### 2. Update Site URL
In Authentication → URL Configuration:
- **Site URL**: Your Vercel deployment URL (e.g., `https://daily-segment.vercel.app`)
- **Redirect URLs**: Add your deployment URL and localhost for testing

### 3. Run Schema
Execute `supabase-schema.sql` in the SQL Editor to create tables and RLS policies.

### 4. Test Locally
```bash
# Serve the HTML file on HTTPS
# OAuth requires HTTPS (localhost works)
npx http-server -p 8080 --gzip --cors
```

Then access via `https://localhost:8080` (you may need to use a tool like `local-ssl-proxy`).

## How It Works

1. **Sign In**
   - User clicks Apple, Google, or Email button
   - For email: Supabase sends magic link
   - For OAuth: User is redirected to provider, then back to app

2. **Session Persistence**
   - Supabase Auth SDK stores session in localStorage (configured with `persistSession: true`)
   - On page refresh, session is automatically restored

3. **Database Access**
   - All database queries use RLS policies
   - User can only read their own profile and collection
   - User can only insert/update runs as themselves
   - Leaderboard is public read-only for all users

4. **Server-Side Validation**
   - Currently: client sets `validated=true` when posting
   - Future: Edge Function should validate trace before marking as ranked

## Testing Checklist
- [ ] Email magic link sign-in works
- [ ] Google OAuth sign-in works
- [ ] Apple Sign In works
- [ ] User can record a run and see it on leaderboard
- [ ] User can sign out
- [ ] Profile data persists across refreshes
- [ ] Leaderboard shows validated runs only
- [ ] RLS prevents reading other users' data

## Deployment Notes
- OAuth redirects require exact URL match in Supabase config
- Session persistence works automatically in browser
- For mobile apps, use Capacitor or native OAuth integrations
