-- Add image_url to post_comments to support media uploads
ALTER TABLE post_comments
ADD COLUMN IF NOT EXISTS image_url TEXT;
