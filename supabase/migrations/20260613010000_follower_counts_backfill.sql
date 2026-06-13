-- =================================================================================
-- Migration: Backfill follower and following counts in profiles
-- =================================================================================

-- Sync following_count
UPDATE public.profiles p
SET following_count = (
  SELECT COUNT(*) FROM public.follows f WHERE f.follower_id = p.id
);

-- Sync follower_count
UPDATE public.profiles p
SET follower_count = (
  SELECT COUNT(*) FROM public.follows f WHERE f.following_id = p.id
);
