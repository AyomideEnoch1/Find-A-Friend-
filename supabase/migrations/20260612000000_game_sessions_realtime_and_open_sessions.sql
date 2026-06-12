-- ============================================================
-- game_sessions realtime + open random matchmaking sessions
-- ============================================================

-- Create the game_sessions table if it doesn't exist (record final results)
CREATE TABLE IF NOT EXISTS game_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type        text NOT NULL CHECK (game_type IN ('pool', 'trivia', 'wordle')),
  player1_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  winner_id        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  score            jsonb NOT NULL DEFAULT '{}',
  duration_seconds integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz
);

-- 1. Enable Realtime on game_sessions so the leaderboard channel
--    receives INSERT events when new results are recorded.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
  END IF;
END $$;

-- 2. Add RLS policies so any authenticated user can query/create
--    game_sessions (needed by recordGameResult + getLeaderboard).
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can view completed sessions (leaderboard queries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'game_sessions' AND policyname = 'anyone can read game_sessions'
  ) THEN
    CREATE POLICY "anyone can read game_sessions"
      ON game_sessions FOR SELECT
      USING (true);
  END IF;
END $$;

-- Players can insert their own game sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'game_sessions' AND policyname = 'players can insert game_sessions'
  ) THEN
    CREATE POLICY "players can insert game_sessions"
      ON game_sessions FOR INSERT
      WITH CHECK (auth.uid() = player1_id);
  END IF;
END $$;

-- 3. Allow unauthenticated/random-match lookup: any authenticated user
--    can see live_game_sessions that are in 'waiting' state with no guest
--    (for random matchmaking).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_game_sessions' AND policyname = 'anyone can see open waiting sessions'
  ) THEN
    CREATE POLICY "anyone can see open waiting sessions"
      ON live_game_sessions FOR SELECT
      USING (status = 'waiting' AND guest_id IS NULL);
  END IF;
END $$;
