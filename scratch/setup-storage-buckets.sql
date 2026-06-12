-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES 
  ('avatars', 'avatars', true, 5242880),
  ('event-covers', 'event-covers', true, 10485760),
  ('club-covers', 'club-covers', true, 10485760),
  ('stories', 'stories', true, 20971520),
  ('chat-files', 'chat-files', true, 52428800),
  ('academic-resources', 'academic-resources', false, 52428800),
  ('vendor-assets', 'vendor-assets', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Policies for public select
DROP POLICY IF EXISTS "avatars: public read" ON storage.objects;
CREATE POLICY "avatars: public read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "event-covers: public read" ON storage.objects;
CREATE POLICY "event-covers: public read" ON storage.objects FOR SELECT USING (bucket_id = 'event-covers');

DROP POLICY IF EXISTS "club-covers: public read" ON storage.objects;
CREATE POLICY "club-covers: public read" ON storage.objects FOR SELECT USING (bucket_id = 'club-covers');

DROP POLICY IF EXISTS "stories: public read" ON storage.objects;
CREATE POLICY "stories: public read" ON storage.objects FOR SELECT USING (bucket_id = 'stories');

DROP POLICY IF EXISTS "chat-files: public read" ON storage.objects;
CREATE POLICY "chat-files: public read" ON storage.objects FOR SELECT USING (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "vendor-assets: public read" ON storage.objects;
CREATE POLICY "vendor-assets: public read" ON storage.objects FOR SELECT USING (bucket_id = 'vendor-assets');

-- Policies for authenticated inserts
DROP POLICY IF EXISTS "avatars: auth insert" ON storage.objects;
CREATE POLICY "avatars: auth insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "event-covers: auth insert" ON storage.objects;
CREATE POLICY "event-covers: auth insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-covers' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "club-covers: auth insert" ON storage.objects;
CREATE POLICY "club-covers: auth insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'club-covers' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "stories: auth insert" ON storage.objects;
CREATE POLICY "stories: auth insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "chat-files: auth insert" ON storage.objects;
CREATE POLICY "chat-files: auth insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "academic-resources: auth insert" ON storage.objects;
CREATE POLICY "academic-resources: auth insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'academic-resources' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "vendor-assets: auth insert" ON storage.objects;
CREATE POLICY "vendor-assets: auth insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vendor-assets' AND auth.role() = 'authenticated');

-- Policies for authenticated updates/deletes (own objects)
DROP POLICY IF EXISTS "avatars: auth delete" ON storage.objects;
CREATE POLICY "avatars: auth delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "event-covers: auth delete" ON storage.objects;
CREATE POLICY "event-covers: auth delete" ON storage.objects FOR DELETE USING (bucket_id = 'event-covers' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "club-covers: auth delete" ON storage.objects;
CREATE POLICY "club-covers: auth delete" ON storage.objects FOR DELETE USING (bucket_id = 'club-covers' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "stories: auth delete" ON storage.objects;
CREATE POLICY "stories: auth delete" ON storage.objects FOR DELETE USING (bucket_id = 'stories' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "chat-files: auth delete" ON storage.objects;
CREATE POLICY "chat-files: auth delete" ON storage.objects FOR DELETE USING (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "academic-resources: auth delete" ON storage.objects;
CREATE POLICY "academic-resources: auth delete" ON storage.objects FOR DELETE USING (bucket_id = 'academic-resources' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "vendor-assets: auth delete" ON storage.objects;
CREATE POLICY "vendor-assets: auth delete" ON storage.objects FOR DELETE USING (bucket_id = 'vendor-assets' AND auth.role() = 'authenticated');
