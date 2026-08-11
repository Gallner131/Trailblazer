# Testing Supabase Auth Integration

## Quick Start

The auth integration is now live and will auto-deploy to Vercel.

### What's New
1. **Sign-in Screen** appears first when opening the app
2. **Three auth methods**:
   - Email magic link (passwordless)
   - Google OAuth
   - Apple Sign In
3. **User data** is now tied to authenticated accounts
4. **Leaderboard** shows real user data with RLS enforcement
5. **Sign-out button** in the "You" tab

### Vercel Deployment
The app will auto-deploy when commits are pushed to main:
- GitHub webhook triggers Vercel build
- Should deploy within ~1 minute
- URL: https://daily-segment.vercel.app (or your custom domain)

### Testing Checklist

#### Email Sign-In
- [ ] Click "Sign in with email"
- [ ] Enter a test email (e.g., `test@example.com`)
- [ ] Check email inbox for magic link
- [ ] Click link to complete sign-in
- [ ] App loads with location prompt

#### OAuth Sign-In (requires Supabase config)
- [ ] Configure Google OAuth in Supabase dashboard
- [ ] Configure Apple Sign In in Supabase dashboard
- [ ] Click "Sign in with Google" → redirects to Google → returns authenticated
- [ ] Click "Sign in with Apple" → redirects to Apple → returns authenticated

#### Core Functionality
- [ ] After sign-in, location prompt appears
- [ ] Record a test run
- [ ] Run appears on leaderboard with user's name
- [ ] Click "You" tab → see your runs + "Sign out" button
- [ ] Click "Sign out" → returns to sign-in screen

#### Database RLS
- [ ] Only authenticated users can post runs
- [ ] Each user only sees their own profile data (check DB directly)
- [ ] Leaderboard is readable by all authenticated users
- [ ] Cannot modify other users' runs (try via DB)

### Supabase Setup Required

Before testing, configure in Supabase dashboard:

1. **SQL Editor** → Run `supabase-schema.sql` to create tables
2. **Authentication → Providers**:
   - Google: Add OAuth credentials
   - Apple: Add Sign In with Apple credentials
   - Email: Already enabled
3. **Authentication → URL Configuration**:
   - Site URL: `https://daily-segment.vercel.app`
   - Redirect URLs: Add `https://daily-segment.vercel.app/auth/v1/callback`

### Common Issues

**"No Segments Found"**
- The app still uses live Overpass API — needs internet connection
- Make sure location permission is granted
- If in a rural area, increase search radius in code

**"Leaderboard offline"**
- Check Supabase project is accessible
- Verify API keys in code match Supabase project
- Check RLS policies exist (from schema.sql)

**OAuth redirects fail**
- Check redirect URL in Supabase matches deployment URL exactly
- Make sure OAuth credentials are created in respective provider dashboards
- Test on Vercel deployment (not localhost) first

**Email magic link not arriving**
- Check spam folder
- Verify email domain is not filtered by provider
- Check Supabase Email Templates are configured

### Next Steps (v1.0)

After confirming auth works:
1. ✅ **Done**: Auth integration
2. **Next**: Server-side trace validation Edge Function
3. **Then**: RLS policy testing
4. **Then**: Collection tracking
5. **Then**: Streaks with auto-freeze

### Files Changed
- `index.html` — Added Supabase Auth SDK + sign-in UI + auth functions
- `supabase-schema.sql` — Database schema with RLS
- `AUTH_SETUP.md` — Detailed setup guide
