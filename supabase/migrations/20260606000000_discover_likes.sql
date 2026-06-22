-- Migration: create discover_likes table and enable realtime
-- Timestamp: 20260606000000

CREATE TABLE IF NOT EXISTS public.discover_likes (
  liker_id UUID NOT NULL,
  liked_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (liker_id, liked_id),
  CONSTRAINT discover_likes_liker_id_fkey FOREIGN KEY (liker_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT discover_likes_liked_id_fkey FOREIGN KEY (liked_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.discover_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can insert own likes" ON public.discover_likes;
CREATE POLICY "Users can insert own likes"
  ON public.discover_likes FOR INSERT
  WITH CHECK (auth.uid() = liker_id);

DROP POLICY IF EXISTS "Users can view likes they sent or received" ON public.discover_likes;
CREATE POLICY "Users can view likes they sent or received"
  ON public.discover_likes FOR SELECT
  USING (auth.uid() = liker_id OR auth.uid() = liked_id);

DROP POLICY IF EXISTS "Users can delete own likes" ON public.discover_likes;
CREATE POLICY "Users can delete own likes"
  ON public.discover_likes FOR DELETE
  USING (auth.uid() = liker_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE discover_likes;
