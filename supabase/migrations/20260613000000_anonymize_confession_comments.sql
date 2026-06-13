-- Retroactively anonymize existing comments on anonymous posts
UPDATE public.post_comments
SET is_anonymous = true
FROM public.posts
WHERE post_comments.post_id = posts.id
  AND posts.is_anonymous = true;

-- Trigger function to enforce anonymity for new comments
CREATE OR REPLACE FUNCTION public.force_anonymous_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- If the post is anonymous, the comment must also be anonymous
  IF EXISTS (SELECT 1 FROM public.posts WHERE id = NEW.post_id AND is_anonymous = true) THEN
    NEW.is_anonymous = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger
DROP TRIGGER IF EXISTS trg_force_anonymous_comment ON public.post_comments;
CREATE TRIGGER trg_force_anonymous_comment
  BEFORE INSERT OR UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.force_anonymous_comment();
