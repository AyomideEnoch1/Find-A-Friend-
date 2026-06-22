-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1. Insert default settings for chat_retention_days if not exists
INSERT INTO public.system_settings (key, value, updated_at)
VALUES ('chat_retention_days', '30'::jsonb, now())
ON CONFLICT (key) DO NOTHING;

-- 2. Create function to set story expiration based on story_retention_hours setting
CREATE OR REPLACE FUNCTION public.set_story_expiration()
RETURNS TRIGGER AS $$
DECLARE
  retention_hours INT;
BEGIN
  SELECT (value#>>'{}')::int INTO retention_hours FROM public.system_settings WHERE key = 'story_retention_hours';
  IF NOT FOUND OR retention_hours IS NULL THEN
    retention_hours := 24;
  END IF;
  NEW.expires_at := NEW.created_at + (retention_hours || ' hours')::interval;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger on stories table to automatically calculate expiration on insert
DROP TRIGGER IF EXISTS tr_set_story_expiration ON public.stories;
CREATE TRIGGER tr_set_story_expiration
  BEFORE INSERT ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_story_expiration();

-- 4. Create database function to perform content cleanup (posts, stories, chats)
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS VOID AS $$
DECLARE
  post_days INT;
  chat_days INT;
BEGIN
  -- Load post retention setting
  SELECT (value#>>'{}')::int INTO post_days FROM public.system_settings WHERE key = 'post_retention_days';
  IF NOT FOUND OR post_days IS NULL THEN
    post_days := 30;
  END IF;

  -- Load chat retention setting
  SELECT (value#>>'{}')::int INTO chat_days FROM public.system_settings WHERE key = 'chat_retention_days';
  IF NOT FOUND OR chat_days IS NULL THEN
    chat_days := 30;
  END IF;

  -- Delete posts older than post_days
  DELETE FROM public.posts WHERE created_at < now() - (post_days || ' days')::interval;

  -- Delete expired stories
  DELETE FROM public.stories WHERE expires_at < now();

  -- Delete direct messages older than chat_days
  DELETE FROM public.messages WHERE created_at < now() - (chat_days || ' days')::interval;

  -- Delete group/club/study messages older than chat_days
  DELETE FROM public.club_messages WHERE created_at < now() - (chat_days || ' days')::interval;
  DELETE FROM public.study_group_messages WHERE created_at < now() - (chat_days || ' days')::interval;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Try to schedule the daily cleanup job if cron schema/extension is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule existing if any to avoid duplication
    PERFORM cron.unschedule('daily-retention-cleanup');
    PERFORM cron.schedule('daily-retention-cleanup', '0 3 * * *', 'SELECT public.cleanup_expired_data();');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignore if pg_cron is not enabled or permission denied
END $$;
