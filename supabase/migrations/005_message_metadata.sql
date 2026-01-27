-- Add metadata column to messages for internal notes and other features
-- This column stores JSON data including is_internal flag

ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Index for querying internal notes efficiently
-- GIN index allows fast lookups on JSONB fields
CREATE INDEX IF NOT EXISTS idx_messages_metadata ON messages USING gin(metadata);

-- Add a comment explaining the metadata structure
COMMENT ON COLUMN messages.metadata IS 'JSON metadata for messages. Keys: is_internal (boolean) - marks internal agent-only notes';
