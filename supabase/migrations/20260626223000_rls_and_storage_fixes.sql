-- 1. RLS Delete Policy for Notifications
DROP POLICY IF EXISTS "notifs: own delete" ON public.notifications;
CREATE POLICY "notifs: own delete" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- 2. RLS Delete Policy for Study Groups
DROP POLICY IF EXISTS "study_groups: creator delete" ON public.study_groups;
CREATE POLICY "study_groups: creator delete" ON public.study_groups
  FOR DELETE USING (auth.uid() = created_by);

-- 3. Storage Policies for Academic Resources
DROP POLICY IF EXISTS "academic-resources: auth select" ON storage.objects;
CREATE POLICY "academic-resources: auth select" ON storage.objects
  FOR SELECT USING (bucket_id = 'academic-resources');

DROP POLICY IF EXISTS "academic-resources: auth insert" ON storage.objects;
CREATE POLICY "academic-resources: auth insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'academic-resources');
