-- Migration: Add joined_at to club_members if it doesn't exist
-- The table may have been created before this column was defined in migrations

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'club_members'
      AND column_name  = 'joined_at'
  ) THEN
    ALTER TABLE public.club_members
      ADD COLUMN joined_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;
