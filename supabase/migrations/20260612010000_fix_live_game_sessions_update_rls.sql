-- Fix live_game_sessions RLS to allow any user to join an open random matchmaking session.
-- Currently, UPDATE only allows users if they are already host_id or guest_id.
-- Since random matchmaking sessions start with guest_id IS NULL, players cannot join.

DROP POLICY IF EXISTS "participants can update" ON live_game_sessions;

CREATE POLICY "participants can update"
  ON live_game_sessions FOR UPDATE
  USING (
    auth.uid() = host_id 
    OR auth.uid() = guest_id 
    OR (status = 'waiting' AND guest_id IS NULL)
  )
  WITH CHECK (
    auth.uid() = host_id 
    OR auth.uid() = guest_id
  );
