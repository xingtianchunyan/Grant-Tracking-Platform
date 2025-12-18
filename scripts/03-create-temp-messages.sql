-- Create temp_messages table for Discord bot integration
CREATE TABLE IF NOT EXISTS temp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Index for faster lookup and cleanup
CREATE INDEX IF NOT EXISTS idx_temp_messages_expires_at ON temp_messages(expires_at);
