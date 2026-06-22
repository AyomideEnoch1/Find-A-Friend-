-- Migration: Backfill Daily Login Streaks
-- Sets current_streak = 1 and last_active_date = today for any profile where
-- current_streak is 0 or NULL (never logged activity yet).
-- This gives existing active users an initial 1-day streak so that it increments correctly on their next login.

UPDATE public.profiles
SET
  current_streak   = 1,
  longest_streak   = GREATEST(1, COALESCE(longest_streak, 0)),
  last_active_date = CURRENT_DATE
WHERE current_streak = 0 OR current_streak IS NULL;
