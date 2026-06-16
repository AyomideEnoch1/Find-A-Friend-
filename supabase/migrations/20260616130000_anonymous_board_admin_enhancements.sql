-- Migration: Anonymous Board Admin Enhancements
-- Timestamp: 20260616130000

-- 1. Add is_anonymous_linked column to events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_anonymous_linked BOOLEAN DEFAULT false;

-- 2. Update posts deletion policy to allow admins to delete posts
DROP POLICY IF EXISTS "posts: delete own" ON public.posts;
CREATE POLICY "posts: delete own" ON public.posts
  FOR DELETE USING (
    auth.uid() = author_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. Update events insert, update, delete policies to allow admins
DROP POLICY IF EXISTS "events: organizer insert" ON public.events;
CREATE POLICY "events: organizer insert" ON public.events
  FOR INSERT WITH CHECK (
    auth.uid() = organizer_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. Update events update, delete policies to allow admins
DROP POLICY IF EXISTS "events: organizer update" ON public.events;
CREATE POLICY "events: organizer update" ON public.events
  FOR UPDATE USING (
    auth.uid() = organizer_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "events: organizer delete" ON public.events;
CREATE POLICY "events: organizer delete" ON public.events
  FOR DELETE USING (
    auth.uid() = organizer_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. Enable RLS on system_settings and add policies if not present
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings: read all" ON public.system_settings;
CREATE POLICY "system_settings: read all" ON public.system_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "system_settings: admin write" ON public.system_settings;
CREATE POLICY "system_settings: admin write" ON public.system_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
