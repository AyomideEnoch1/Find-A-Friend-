-- =================================================================================
-- Update feedback comment notifications to notify all participants
-- =================================================================================

CREATE OR REPLACE FUNCTION public.trg_fn_feedback_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_feedback_author UUID;
  v_participant UUID;
BEGIN
  -- 1. Notify the original author of the feedback (if they aren't the one commenting)
  SELECT author_id INTO v_feedback_author FROM public.feedbacks WHERE id = NEW.feedback_id;
  
  IF v_feedback_author != NEW.author_id THEN
    PERFORM public.create_notification(
      v_feedback_author,
      'feedback_comment',
      NEW.author_id,
      'feedback',
      NEW.feedback_id,
      LEFT(NEW.body, 100)
    );
  END IF;

  -- 2. Notify all other unique users who have commented on this feedback
  --    (excluding the original author, since we just notified them, and excluding the new commenter)
  FOR v_participant IN 
    SELECT DISTINCT author_id 
    FROM public.feedback_comments 
    WHERE feedback_id = NEW.feedback_id
      AND author_id != NEW.author_id
      AND author_id != v_feedback_author
  LOOP
    PERFORM public.create_notification(
      v_participant,
      'feedback_comment',
      NEW.author_id,
      'feedback',
      NEW.feedback_id,
      LEFT(NEW.body, 100)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
