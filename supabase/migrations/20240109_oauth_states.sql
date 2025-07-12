-- Create oauth_states table for CSRF protection
CREATE TABLE IF NOT EXISTS oauth_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index
CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_user_id ON oauth_states(user_id);
CREATE INDEX idx_oauth_states_expires_at ON oauth_states(expires_at);

-- Enable RLS
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own OAuth states"
  ON oauth_states FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own OAuth states"
  ON oauth_states FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OAuth states"
  ON oauth_states FOR DELETE
  USING (auth.uid() = user_id);

-- Function to clean up expired states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired states (requires pg_cron extension)
-- This would be run separately or via a cron job
-- SELECT cron.schedule('cleanup-oauth-states', '0 * * * *', 'SELECT cleanup_expired_oauth_states();');