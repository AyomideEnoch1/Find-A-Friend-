-- Migration: Admin Badge, Admin Post Notifications, and Advanced Club Admin Privileges
-- Timestamp: 20260611000000

-- 1. Promote Ayomide Enoch to Admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'olugbodi13123@run.edu.ng' OR email = 'ayomidenoch15@gmail.com';

-- 2. Admin Post Notification Trigger
CREATE OR REPLACE FUNCTION public.notify_on_admin_post()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_role TEXT;
  v_admin_name TEXT;
  v_recipient_id UUID;
BEGIN
  -- Get post author info
  SELECT role, full_name INTO v_admin_role, v_admin_name FROM public.profiles WHERE id = NEW.author_id;
  
  -- Trigger notifications if author is admin, post is not anonymous, and it is a public post type
  IF v_admin_role = 'admin' AND NEW.is_anonymous = false AND NEW.post_type IN ('feed', 'club', 'academic') THEN
    FOR v_recipient_id IN 
      SELECT id FROM public.profiles WHERE id != NEW.author_id
    LOOP
      INSERT INTO public.notifications (user_id, type, actor_id, entity_type, entity_id, body)
      VALUES (
        v_recipient_id,
        'announcement',
        NEW.author_id,
        'post',
        NEW.id,
        v_admin_name || ' posted: ' || substring(NEW.body from 1 for 100)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_admin_post ON public.posts;
CREATE TRIGGER trg_notify_on_admin_post
AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.notify_on_admin_post();

-- 3. Update RLS policies for Clubs
-- Allow any authenticated user to create a club
DROP POLICY IF EXISTS "clubs: admin insert" ON public.clubs;
CREATE POLICY "clubs: anyone authenticated can insert" ON public.clubs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- Allow club creators or club admins to update clubs
DROP POLICY IF EXISTS "clubs: admin update" ON public.clubs;
CREATE POLICY "clubs: creator or admin can update" ON public.clubs
  FOR UPDATE USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- Allow club creators or club admins to delete clubs
DROP POLICY IF EXISTS "clubs: creator or admin can delete" ON public.clubs;
CREATE POLICY "clubs: creator or admin can delete" ON public.clubs
  FOR DELETE USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = id AND user_id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Update RLS policies for Club Members
-- Allow club creators or club admins to add members directly
DROP POLICY IF EXISTS "club_members: admin insert" ON public.club_members;
CREATE POLICY "club_members: admin insert" ON public.club_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = club_members.club_id AND user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE id = club_members.club_id AND created_by = auth.uid()
    )
  );

-- Allow club creators or club admins to update member roles (e.g. promote/demote)
DROP POLICY IF EXISTS "club_members: admin update" ON public.club_members;
CREATE POLICY "club_members: admin update" ON public.club_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = club_members.club_id AND user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE id = club_members.club_id AND created_by = auth.uid()
    )
  );

-- Allow club creators or club admins to remove/kick members
DROP POLICY IF EXISTS "club_members: admin delete" ON public.club_members;
CREATE POLICY "club_members: admin delete" ON public.club_members
  FOR DELETE USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_id = club_members.club_id AND user_id = auth.uid() AND role = 'admin'
    ) OR
    EXISTS (
      SELECT 1 FROM public.clubs
      WHERE id = club_members.club_id AND created_by = auth.uid()
    )
  );
