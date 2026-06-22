-- Migration: Add missing triggers for connection requests, RSVPs, club announcements, story views, and mentions
-- Timestamp: 20260609192200

-- 1. Connection request notification
CREATE OR REPLACE FUNCTION public.trg_fn_connection_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' THEN
    PERFORM public.create_notification(
      NEW.receiver_id,
      'connection_request',
      NEW.requester_id,
      NULL,
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_connection_notification ON public.connections;
CREATE TRIGGER trg_connection_notification
AFTER INSERT ON public.connections
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_connection_notification();

-- 2. Event RSVP notification
CREATE OR REPLACE FUNCTION public.trg_fn_event_rsvp_notification()
RETURNS TRIGGER AS $$
DECLARE v_organizer_id UUID;
BEGIN
  IF NEW.status = 'going' THEN
    SELECT organizer_id INTO v_organizer_id FROM public.events WHERE id = NEW.event_id;
    PERFORM public.create_notification(
      v_organizer_id,
      'event_rsvp',
      NEW.user_id,
      'event',
      NEW.event_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_event_rsvp_notification ON public.event_rsvps;
CREATE TRIGGER trg_event_rsvp_notification
AFTER INSERT ON public.event_rsvps
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_event_rsvp_notification();

-- 3. Club announcement notification
CREATE OR REPLACE FUNCTION public.trg_fn_club_announcement_notification()
RETURNS TRIGGER AS $$
DECLARE v_member_id UUID;
BEGIN
  FOR v_member_id IN
    SELECT user_id FROM public.club_members
    WHERE club_id = NEW.club_id AND user_id != NEW.author_id
  LOOP
    PERFORM public.create_notification(
      v_member_id,
      'club_announcement',
      NEW.author_id,
      'club',
      NEW.club_id,
      LEFT(NEW.body, 100)
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_club_announcement_notification ON public.club_announcements;
CREATE TRIGGER trg_club_announcement_notification
AFTER INSERT ON public.club_announcements
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_club_announcement_notification();

-- 4. Story view notification
CREATE OR REPLACE FUNCTION public.trg_fn_story_view_notification()
RETURNS TRIGGER AS $$
DECLARE v_author_id UUID;
BEGIN
  SELECT author_id INTO v_author_id FROM public.stories WHERE id = NEW.story_id;
  PERFORM public.create_notification(
    v_author_id,
    'story_view',
    NEW.viewer_id,
    'story',
    NEW.story_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_story_view_notification ON public.story_views;
CREATE TRIGGER trg_story_view_notification
AFTER INSERT ON public.story_views
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_story_view_notification();

-- 5. Mention notification (in posts)
CREATE OR REPLACE FUNCTION public.trg_fn_post_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
BEGIN
  IF NEW.is_anonymous = true THEN RETURN NEW; END IF;

  FOR v_profile IN
    SELECT id, full_name FROM public.profiles
    WHERE NEW.body ~* ('@' || replace(full_name, ' ', '[[:space:]]+'))
      AND id != NEW.author_id
  LOOP
    PERFORM public.create_notification(
      v_profile.id,
      'mention',
      NEW.author_id,
      'post',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_post_mention_notification ON public.posts;
CREATE TRIGGER trg_post_mention_notification
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_post_mention_notification();

-- 6. Mention notification (in comments)
CREATE OR REPLACE FUNCTION public.trg_fn_comment_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_profile RECORD;
BEGIN
  IF NEW.is_anonymous = true THEN RETURN NEW; END IF;

  FOR v_profile IN
    SELECT id, full_name FROM public.profiles
    WHERE NEW.body ~* ('@' || replace(full_name, ' ', '[[:space:]]+'))
      AND id != NEW.author_id
  LOOP
    PERFORM public.create_notification(
      v_profile.id,
      'mention',
      NEW.author_id,
      'post',
      NEW.post_id
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_comment_mention_notification ON public.post_comments;
CREATE TRIGGER trg_comment_mention_notification
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_comment_mention_notification();
