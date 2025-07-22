-- Add rich content support to posts table
ALTER TABLE posts 
ADD COLUMN IF NOT EXISTS rich_content JSONB,
ADD COLUMN IF NOT EXISTS mentions JSONB DEFAULT '[]'::jsonb;

-- Create index for mention searches
CREATE INDEX IF NOT EXISTS idx_posts_mentions ON posts USING gin(mentions);

-- Add comment
COMMENT ON COLUMN posts.rich_content IS 'TipTap editor JSON content';
COMMENT ON COLUMN posts.mentions IS 'Array of mentioned user IDs';