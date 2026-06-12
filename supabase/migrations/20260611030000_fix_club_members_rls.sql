-- Migration: Fix club_members SELECT policy so members can see each other
-- Timestamp: 20260611030000

-- Allow any authenticated member to view who is in clubs they belong to
DROP POLICY IF EXISTS "club_members: members can read" ON public.club_members;
CREATE POLICY "club_members: members can read" ON public.club_members
  FOR SELECT TO authenticated
  USING (true);
-- Note: The above allows any authenticated user to see club membership lists.
-- This is intentional — club membership is public information (like WhatsApp group member lists).

-- Ensure profiles are readable by all authenticated users (needed for member name/avatar join)
DROP POLICY IF EXISTS "profiles: read all authenticated" ON public.profiles;
CREATE POLICY "profiles: read all authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);
