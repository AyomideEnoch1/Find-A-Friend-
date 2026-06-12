-- Add parent_id to post_comments to support threaded replies
ALTER TABLE post_comments
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES post_comments(id) ON DELETE CASCADE;

-- Add index for fast querying
CREATE INDEX IF NOT EXISTS idx_post_comments_parent_id ON post_comments(parent_id);
