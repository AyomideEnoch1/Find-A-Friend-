-- Migration: Add streak columns to profiles

ALTER TABLE public.profiles
ADD COLUMN current_streak int DEFAULT 0,
ADD COLUMN longest_streak int DEFAULT 0,
ADD COLUMN last_active_date date;

-- Create an RPC to record daily activity and return the new streak info
CREATE OR REPLACE FUNCTION record_daily_activity(client_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_active date;
  v_current_streak int;
  v_longest_streak int;
  v_new_streak int;
  v_increased boolean := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Lock the row for update to prevent race conditions from double-opening the app
  SELECT last_active_date, COALESCE(current_streak, 0), COALESCE(longest_streak, 0)
  INTO v_last_active, v_current_streak, v_longest_streak
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_last_active IS NULL OR v_last_active < client_date - interval '1 day' THEN
    -- Streak broken or first time
    v_new_streak := 1;
    v_increased := true;
    
    UPDATE profiles
    SET current_streak = v_new_streak,
        longest_streak = GREATEST(v_new_streak, v_longest_streak),
        last_active_date = client_date
    WHERE id = v_user_id;
    
  ELSIF v_last_active = client_date - interval '1 day' THEN
    -- Streak continued
    v_new_streak := v_current_streak + 1;
    v_increased := true;
    
    UPDATE profiles
    SET current_streak = v_new_streak,
        longest_streak = GREATEST(v_new_streak, v_longest_streak),
        last_active_date = client_date
    WHERE id = v_user_id;
    
  ELSE
    -- Already logged today (or client date is in the past/future oddly), do nothing
    v_new_streak := v_current_streak;
    v_increased := false;
  END IF;

  RETURN json_build_object(
    'current_streak', v_new_streak,
    'longest_streak', GREATEST(v_new_streak, v_longest_streak),
    'increased', v_increased
  );
END;
$$;
