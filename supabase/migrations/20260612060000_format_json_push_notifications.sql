-- =================================================================================
-- Format JSON payloads for push notifications
-- =================================================================================

-- Helper function to parse JSON bodies from messages and return a clean text string
CREATE OR REPLACE FUNCTION public.format_message_preview(p_body TEXT)
RETURNS TEXT AS $$
DECLARE
  v_parsed JSONB;
  v_type TEXT;
BEGIN
  -- Attempt to parse as JSON. If it fails or is null, fallback to plain text.
  BEGIN
    v_parsed := p_body::jsonb;
    v_type := v_parsed->>'_type';
    
    IF v_type = 'game_challenge' THEN
      RETURN 'Sent a ' || COALESCE(v_parsed->>'label', 'Game') || ' challenge ' || COALESCE(v_parsed->>'emoji', '🎮');
    ELSIF v_type = 'challenge_accepted' THEN
      RETURN 'Accepted your ' || COALESCE(v_parsed->>'label', 'Game') || ' challenge ' || COALESCE(v_parsed->>'emoji', '🎮');
    ELSIF v_type = 'story_reaction' THEN
      RETURN 'Reacted to your story ' || COALESCE(v_parsed->>'emoji', '🔥');
    ELSIF v_type = 'story_comment' THEN
      RETURN 'Replied to your story: ' || COALESCE(v_parsed->>'body', '');
    ELSIF v_type = 'image' THEN
      RETURN '📷 Photo';
    ELSIF v_type = 'video' THEN
      RETURN '🎥 Video';
    ELSIF v_type = 'reply' THEN
      RETURN COALESCE(v_parsed->>'text', 'Replied to a message');
    END IF;
    
    RETURN LEFT(p_body, 100);
  EXCEPTION
    WHEN OTHERS THEN
      -- Not valid JSON, just return text
      RETURN LEFT(p_body, 100);
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the message notification trigger to use the new formatter
CREATE OR REPLACE FUNCTION public.trg_fn_message_notification()
RETURNS TRIGGER AS $$
DECLARE v_recipient UUID;
BEGIN
  SELECT user_id INTO v_recipient
  FROM public.conversation_participants
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
  LIMIT 1;

  PERFORM public.create_notification(
    v_recipient, 'new_message', NEW.sender_id,
    NULL, NULL, public.format_message_preview(NEW.body)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
