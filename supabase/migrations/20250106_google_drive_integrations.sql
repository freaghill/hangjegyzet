-- Create google_drive_integrations table
CREATE TABLE IF NOT EXISTS google_drive_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ,
  watched_folders JSONB DEFAULT '[]'::jsonb, -- Array of {id, name, lastSyncedAt}
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, organization_id)
);

-- Create indexes
CREATE INDEX idx_google_drive_integrations_user ON google_drive_integrations(user_id);
CREATE INDEX idx_google_drive_integrations_org ON google_drive_integrations(organization_id);
CREATE INDEX idx_google_drive_integrations_active ON google_drive_integrations(is_active) WHERE is_active = true;

-- RLS policies
ALTER TABLE google_drive_integrations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own integrations
CREATE POLICY "Users can manage their own Google Drive integrations" ON google_drive_integrations
  FOR ALL USING (user_id = auth.uid());

-- Organization admins can view integrations
CREATE POLICY "Organization admins can view Google Drive integrations" ON google_drive_integrations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON google_drive_integrations TO authenticated;

-- Create google_drive_sync_logs table for tracking sync history
CREATE TABLE IF NOT EXISTS google_drive_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES google_drive_integrations(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  files_found INTEGER DEFAULT 0,
  files_imported INTEGER DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_google_drive_sync_logs_integration ON google_drive_sync_logs(integration_id);
CREATE INDEX idx_google_drive_sync_logs_created ON google_drive_sync_logs(created_at);

-- RLS policies
ALTER TABLE google_drive_sync_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync logs
CREATE POLICY "Users can view their own sync logs" ON google_drive_sync_logs
  FOR SELECT USING (
    integration_id IN (
      SELECT id FROM google_drive_integrations WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON google_drive_sync_logs TO authenticated;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for google_drive_integrations
CREATE TRIGGER update_google_drive_integrations_updated_at BEFORE UPDATE ON google_drive_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();