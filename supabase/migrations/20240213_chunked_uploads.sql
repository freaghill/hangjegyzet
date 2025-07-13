-- Create upload_sessions table for tracking chunked uploads
CREATE TABLE IF NOT EXISTS upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id TEXT NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  total_chunks INTEGER NOT NULL,
  uploaded_chunks INTEGER[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading', 'completed', 'failed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create upload_chunks table for chunk metadata
CREATE TABLE IF NOT EXISTS upload_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id TEXT NOT NULL REFERENCES upload_sessions(upload_id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  chunk_size INTEGER NOT NULL,
  chunk_hash TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(upload_id, chunk_index)
);

-- Create indexes
CREATE INDEX idx_upload_sessions_organization_id ON upload_sessions(organization_id);
CREATE INDEX idx_upload_sessions_user_id ON upload_sessions(user_id);
CREATE INDEX idx_upload_sessions_upload_id ON upload_sessions(upload_id);
CREATE INDEX idx_upload_sessions_expires_at ON upload_sessions(expires_at);
CREATE INDEX idx_upload_chunks_upload_id ON upload_chunks(upload_id);

-- Enable RLS
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_chunks ENABLE ROW LEVEL SECURITY;

-- RLS policies for upload_sessions
CREATE POLICY "Users can view their organization's upload sessions"
  ON upload_sessions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create upload sessions for their organization"
  ON upload_sessions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their organization's upload sessions"
  ON upload_sessions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their organization's upload sessions"
  ON upload_sessions FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS policies for upload_chunks
CREATE POLICY "Users can view chunks for their organization's uploads"
  ON upload_chunks FOR SELECT
  USING (
    upload_id IN (
      SELECT upload_id FROM upload_sessions 
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create chunks for their organization's uploads"
  ON upload_chunks FOR INSERT
  WITH CHECK (
    upload_id IN (
      SELECT upload_id FROM upload_sessions 
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Function to clean up expired upload sessions
CREATE OR REPLACE FUNCTION cleanup_expired_uploads()
RETURNS void AS $$
BEGIN
  DELETE FROM upload_sessions
  WHERE expires_at < NOW()
  AND status = 'uploading';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean up expired uploads (requires pg_cron extension)
-- This should be set up in Supabase dashboard or via API
-- SELECT cron.schedule('cleanup-expired-uploads', '0 * * * *', 'SELECT cleanup_expired_uploads();');