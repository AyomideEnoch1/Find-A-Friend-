INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-files', 'chat-files', true, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat-files: public read" ON storage.objects;
CREATE POLICY "chat-files: public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "chat-files: auth insert" ON storage.objects;
CREATE POLICY "chat-files: auth insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');
