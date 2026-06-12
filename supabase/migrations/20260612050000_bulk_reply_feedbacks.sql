-- =================================================================================
-- Automate reply to all existing feedbacks
-- =================================================================================

DO $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Get the first admin's ID
  SELECT id INTO v_admin_id FROM public.profiles WHERE role = 'admin' LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RAISE NOTICE 'No admin found to post replies. Skipping feedback automation.';
    RETURN;
  END IF;

  -- Insert a reply to all feedbacks that do not already have a reply from this admin
  INSERT INTO public.feedback_comments (feedback_id, author_id, body)
  SELECT id, v_admin_id, 'Thank you for your feedback! The team has noted this and is actively looking into it.'
  FROM public.feedbacks f
  WHERE NOT EXISTS (
    SELECT 1 FROM public.feedback_comments fc
    WHERE fc.feedback_id = f.id AND fc.author_id = v_admin_id
  );
END $$;
