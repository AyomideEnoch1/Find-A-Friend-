-- 1. DELETE ALL CLUBS
-- This will cascade and delete all members, posts, announcements, and events tied to these clubs.
TRUNCATE TABLE clubs CASCADE;

-- 2. CREATE CLUB MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.club_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for club_messages
ALTER TABLE public.club_messages ENABLE ROW LEVEL SECURITY;

-- Read policy: Only club members can read messages
CREATE POLICY "Members read" ON public.club_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM club_members WHERE club_id = club_messages.club_id AND user_id = auth.uid()));

-- Insert policy: Only club members can send messages
CREATE POLICY "Members send" ON public.club_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM club_members WHERE club_id = club_messages.club_id AND user_id = auth.uid()));

-- 3. CREATE STUDY GROUP MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.study_group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for study_group_messages
ALTER TABLE public.study_group_messages ENABLE ROW LEVEL SECURITY;

-- Read policy: Only study group members can read messages
CREATE POLICY "Members read" ON public.study_group_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_group_messages.group_id AND user_id = auth.uid()));

-- Insert policy: Only study group members can send messages
CREATE POLICY "Members send" ON public.study_group_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM study_group_members WHERE group_id = study_group_messages.group_id AND user_id = auth.uid()));

-- 4. Enable Realtime on both tables so chat works correctly
ALTER PUBLICATION supabase_realtime ADD TABLE club_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE study_group_messages;
