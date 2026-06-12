INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Remove existing policies if they exist (to allow rerunning cleanly)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat files" ON storage.objects;

-- Re-create policies for chat-files
CREATE POLICY "chat-files Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'chat-files' );

CREATE POLICY "chat-files Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'chat-files' );

CREATE POLICY "chat-files Users can delete their own"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'chat-files' AND auth.uid() = owner );

CREATE POLICY "chat-files Users can update their own"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'chat-files' AND auth.uid() = owner );
