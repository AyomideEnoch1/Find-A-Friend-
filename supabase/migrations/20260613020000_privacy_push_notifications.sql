-- =================================================================================
-- Update Push Notification payload to obscure message text
-- =================================================================================

CREATE OR REPLACE FUNCTION public.format_message_preview(p_body TEXT)
RETURNS TEXT AS $$
DECLARE
  v_parsed JSONB;
  v_type TEXT;
BEGIN
  -- Attempt to parse as JSON. If it fails or is null, fallback to NULL for privacy
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
      RETURN 'Replied to your story';
    ELSIF v_type = 'image' THEN
      RETURN '📷 Photo';
    ELSIF v_type = 'video' THEN
      RETURN '🎥 Video';
    ELSIF v_type = 'reply' THEN
      RETURN 'Replied to a message';
    END IF;
    
    RETURN NULL;
  EXCEPTION
    WHEN OTHERS THEN
      -- Not valid JSON, meaning it's a standard text message. Return NULL to hide the content.
      RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
