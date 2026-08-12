-- Add notifications_enabled column to profiles table if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notifications_enabled boolean not null default true;
