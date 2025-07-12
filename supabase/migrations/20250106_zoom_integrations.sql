-- Create zoom_integrations table
CREATE TABLE IF NOT EXISTS zoom_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  zoom_user_id TEXT NOT NULL,
  zoom_email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,
  webhook_verification_token TEXT,
  auto_download_enabled BOOLEAN DEFAULT true,
  delete_after_download BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, organization_id)
);

-- Create indexes
CREATE INDEX idx_zoom_integrations_user ON zoom_integrations(user_id);
CREATE INDEX idx_zoom_integrations_org ON zoom_integrations(organization_id);
CREATE INDEX idx_zoom_integrations_active ON zoom_integrations(is_active) WHERE is_active = true;
CREATE INDEX idx_zoom_integrations_zoom_user ON zoom_integrations(zoom_user_id);

-- RLS policies
ALTER TABLE zoom_integrations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own integrations
CREATE POLICY "Users can manage their own Zoom integrations" ON zoom_integrations
  FOR ALL USING (user_id = auth.uid());

-- Organization admins can view integrations
CREATE POLICY "Organization admins can view Zoom integrations" ON zoom_integrations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON zoom_integrations TO authenticated;

-- Create zoom_recordings table
CREATE TABLE IF NOT EXISTS zoom_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES zoom_integrations(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  zoom_meeting_id TEXT NOT NULL,
  zoom_meeting_uuid TEXT NOT NULL,
  topic TEXT NOT NULL,
  host_email TEXT NOT NULL,
  participants JSONB DEFAULT '[]'::jsonb, -- Array of {name, email, join_time, leave_time}
  recording_files JSONB DEFAULT '[]'::jsonb, -- Array of {id, file_type, file_size, download_url, status}
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL, -- in seconds
  total_size BIGINT DEFAULT 0, -- in bytes
  download_status TEXT DEFAULT 'pending', -- pending, downloading, completed, failed
  download_started_at TIMESTAMPTZ,
  download_completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(zoom_meeting_uuid)
);

-- Create indexes
CREATE INDEX idx_zoom_recordings_integration ON zoom_recordings(integration_id);
CREATE INDEX idx_zoom_recordings_meeting ON zoom_recordings(meeting_id);
CREATE INDEX idx_zoom_recordings_zoom_meeting ON zoom_recordings(zoom_meeting_id);
CREATE INDEX idx_zoom_recordings_status ON zoom_recordings(download_status);
CREATE INDEX idx_zoom_recordings_created ON zoom_recordings(created_at);

-- RLS policies
ALTER TABLE zoom_recordings ENABLE ROW LEVEL SECURITY;

-- Users can view their own recordings
CREATE POLICY "Users can view their own Zoom recordings" ON zoom_recordings
  FOR SELECT USING (
    integration_id IN (
      SELECT id FROM zoom_integrations WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON zoom_recordings TO authenticated;

-- Create zoom_webhook_logs table for debugging
CREATE TABLE IF NOT EXISTS zoom_webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  zoom_account_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_zoom_webhook_logs_event ON zoom_webhook_logs(event_type);
CREATE INDEX idx_zoom_webhook_logs_created ON zoom_webhook_logs(created_at);
CREATE INDEX idx_zoom_webhook_logs_processed ON zoom_webhook_logs(processed) WHERE processed = false;

-- Grant permissions
GRANT INSERT ON zoom_webhook_logs TO anon;
GRANT SELECT, UPDATE ON zoom_webhook_logs TO authenticated;

-- Create trigger for zoom_integrations
CREATE TRIGGER update_zoom_integrations_updated_at BEFORE UPDATE ON zoom_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for zoom_recordings
CREATE TRIGGER update_zoom_recordings_updated_at BEFORE UPDATE ON zoom_recordings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();