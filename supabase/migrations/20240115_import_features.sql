-- User integrations for OAuth connections
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('zoom', 'teams', 'google_meet', 'dropbox', 'google_drive', 'onedrive')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Organization email configurations for import
CREATE TABLE IF NOT EXISTS organization_email_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  encrypted_password TEXT NOT NULL,
  imap_host TEXT NOT NULL,
  imap_port INTEGER NOT NULL DEFAULT 993,
  use_tls BOOLEAN DEFAULT TRUE,
  allowed_senders TEXT[] DEFAULT '{}',
  auto_delete BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Import history tracking
CREATE TABLE IF NOT EXISTS import_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('upload', 'zoom', 'teams', 'google_meet', 'email', 'dropbox', 'google_drive', 'onedrive', 'url')),
  filename TEXT NOT NULL,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error TEXT,
  metadata JSONB DEFAULT '{}',
  imported_by UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Watch folders for auto-import
CREATE TABLE IF NOT EXISTS watch_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('dropbox', 'google_drive', 'onedrive', 'local')),
  folder_path TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_scan_at TIMESTAMPTZ,
  scan_interval_minutes INTEGER DEFAULT 15,
  auto_process BOOLEAN DEFAULT TRUE,
  processing_mode TEXT DEFAULT 'balanced',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, provider, folder_path)
);

-- Indexes
CREATE INDEX idx_user_integrations_user ON user_integrations(user_id);
CREATE INDEX idx_user_integrations_provider ON user_integrations(provider);
CREATE INDEX idx_org_email_configs_org ON organization_email_configs(organization_id);
CREATE INDEX idx_org_email_configs_active ON organization_email_configs(is_active);
CREATE INDEX idx_import_history_org ON import_history(organization_id);
CREATE INDEX idx_import_history_meeting ON import_history(meeting_id);
CREATE INDEX idx_import_history_status ON import_history(status);
CREATE INDEX idx_import_history_source ON import_history(source);
CREATE INDEX idx_watch_folders_org ON watch_folders(organization_id);
CREATE INDEX idx_watch_folders_active ON watch_folders(is_active);

-- Enable RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_email_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User integrations: Users can manage their own
CREATE POLICY "Users manage own integrations"
  ON user_integrations FOR ALL
  USING (user_id = auth.uid());

-- Email configs: Organization admins only
CREATE POLICY "Organization admins manage email configs"
  ON organization_email_configs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_email_configs.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

-- Import history: Organization members can view
CREATE POLICY "Organization members view import history"
  ON import_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = import_history.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Import history: Users can create their own
CREATE POLICY "Users create import history"
  ON import_history FOR INSERT
  WITH CHECK (imported_by = auth.uid());

-- Watch folders: Organization admins manage
CREATE POLICY "Organization admins manage watch folders"
  ON watch_folders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = watch_folders.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

-- Function to encrypt passwords
CREATE OR REPLACE FUNCTION encrypt_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- In production, use proper encryption with pgcrypto
  -- For now, just base64 encode
  RETURN encode(password::bytea, 'base64');
END;
$$ LANGUAGE plpgsql;

-- Function to decrypt passwords
CREATE OR REPLACE FUNCTION decrypt_password(encrypted TEXT)
RETURNS TEXT AS $$
BEGIN
  -- In production, use proper decryption with pgcrypto
  -- For now, just base64 decode
  RETURN convert_from(decode(encrypted, 'base64'), 'UTF8');
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps
CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_org_email_configs_updated_at
  BEFORE UPDATE ON organization_email_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE user_integrations IS 'OAuth tokens for external service integrations';
COMMENT ON TABLE organization_email_configs IS 'Email configurations for automatic meeting import';
COMMENT ON TABLE import_history IS 'Track all imports for auditing and debugging';
COMMENT ON TABLE watch_folders IS 'Cloud folders to monitor for automatic imports';