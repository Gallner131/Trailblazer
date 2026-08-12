# Notification Settings Implementation (§20, §22)

## Overview
Added user-configurable notification preferences to the Profile page with three individually togglable notification types. Permission is requested after the user's first completed run, never on page open.

## Changes Made

### 1. Updated `profile.html`
- Replaced the generic "Notifications" checkbox row with a dedicated Notifications section containing three toggles:
  - **Daily segment live** (on by default)
  - **Streak at risk** (on by default)
  - **Someone beat my time** (off by default)
- Added explanatory text: "Receive up to 2 notifications per day. Permission requested after your first run."
- Moved Settings section to contain only "Home area" for clarity

### 2. JavaScript Implementation
- **Notification preference loading** (lines 120-123): On page load, checkbox states are set based on profile data
  - `notif_daily_segment` (default: true)
  - `notif_streak_at_risk` (default: true)
  - `notif_beaten` (default: false)

- **Event listeners** (lines 125-128): Each checkbox calls `updateNotificationPreference()` on change

- **updateNotificationPreference() function** (lines 172-191):
  - Detects if user has completed runs
  - If this is the user's first toggle change AND they have runs, requests Notification permission
  - Tracks permission request in localStorage to avoid repeated prompts
  - Updates the preference in the profiles table

### 3. Database Migration Required
File: `migrations/add_notification_preferences.sql`

Run this SQL in Supabase SQL Editor:
```sql
ALTER TABLE public.profiles
ADD COLUMN notif_daily_segment BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN notif_streak_at_risk BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN notif_beaten BOOLEAN NOT NULL DEFAULT false;
```

This adds three boolean columns to the profiles table:
- `notif_daily_segment`: Daily segment live notification preference
- `notif_streak_at_risk`: Streak at risk notification preference
- `notif_beaten`: Someone beat your time notification preference

## Behavior

### Permission Handling
1. Page load: No permission request (per spec requirement)
2. User toggles a notification: If user has at least one run and this is the first toggle action, requests Notification permission
3. Permission request stored in localStorage to prevent repeated prompts
4. Future toggles do not request permission again

### Individual Controls
Each notification type is independently switchable:
- Users can disable any combination of notifications
- Changes are immediately persisted to the database
- Default states follow spec: daily and streak enabled, beaten disabled

### UI/UX
- Clean section with clear labels
- Checkbox inputs styled with `cursor: pointer` for better UX
- Explanatory text explains the 2/day limit and permission timing
- Placed prominently in Profile page before Recent runs section

## Testing Checklist

- [ ] Run migration SQL in Supabase
- [ ] New profile fields appear in database
- [ ] Profile page loads without errors
- [ ] Notification toggles display correctly (checked/unchecked per defaults)
- [ ] Toggling a notification when user has 0 runs does NOT request permission
- [ ] Toggling a notification when user has 1+ runs requests permission (first time only)
- [ ] Changes persist after page reload
- [ ] Signed-out and signed-in users have isolated preferences

## Deploy
Push to main branch and Vercel will auto-deploy. Test on `https://trailblazer-khn2.vercel.app/profile.html` after deployment.

## Notes
- Permission request only happens via user interaction (toggling), never automatically
- localStorage key `notif_permission_requested` tracks if user has been prompted
- Error handling provides visible feedback if preference updates fail
- The implementation stores preferences in the profiles table, not as a separate table, for simplicity
