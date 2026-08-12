-- Add notification preference columns to profiles table
-- Run in Supabase SQL Editor

ALTER TABLE public.profiles
ADD COLUMN notif_daily_segment BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN notif_streak_at_risk BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN notif_beaten BOOLEAN NOT NULL DEFAULT false;

-- Optional: Add a comment to document the columns
COMMENT ON COLUMN public.profiles.notif_daily_segment IS 'Notification preference: Daily segment live alert';
COMMENT ON COLUMN public.profiles.notif_streak_at_risk IS 'Notification preference: Streak at risk alert';
COMMENT ON COLUMN public.profiles.notif_beaten IS 'Notification preference: Someone beat your time alert';
