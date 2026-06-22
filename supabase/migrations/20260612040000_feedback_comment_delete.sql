-- =================================================================================
-- Add DELETE policy to feedback_comments table
-- =================================================================================

ALTER TABLE public.feedback_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fcomment delete" ON public.feedback_comments;
CREATE POLICY "fcomment delete" ON public.feedback_comments FOR DELETE TO authenticated USING (auth.uid() = author_id);
