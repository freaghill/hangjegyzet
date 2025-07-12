-- Rotatable keys table for managing API keys, secrets, etc.
CREATE TABLE IF NOT EXISTS rotatable_keys (
  id TEXT NOT NULL,
  version INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('api_key', 'jwt_secret', 'encryption_key', 'webhook_secret')),
  name TEXT NOT NULL,
  value TEXT NOT NULL, -- Encrypted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rotating', 'deprecated', 'expired')),
  metadata JSONB DEFAULT '{}',
  PRIMARY KEY (id, version)
);

-- Key rotation logs
CREATE TABLE IF NOT EXISTS key_rotation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  event TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- API keys for organizations
CREATE TABLE IF NOT EXISTS organization_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] DEFAULT '{}',
  rate_limit INTEGER DEFAULT 1000, -- requests per hour
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(organization_id, key_id)
);

-- Indexes
CREATE INDEX idx_rotatable_keys_status ON rotatable_keys(status);
CREATE INDEX idx_rotatable_keys_expires ON rotatable_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_key_rotation_logs_key ON key_rotation_logs(key_id, version);
CREATE INDEX idx_key_rotation_logs_timestamp ON key_rotation_logs(timestamp);
CREATE INDEX idx_org_api_keys_org ON organization_api_keys(organization_id);
CREATE INDEX idx_org_api_keys_key ON organization_api_keys(key_id);
CREATE INDEX idx_org_api_keys_active ON organization_api_keys(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE rotatable_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_rotation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_api_keys ENABLE ROW LEVEL SECURITY;

-- Only system can manage rotatable keys
CREATE POLICY "System manages rotatable keys"
  ON rotatable_keys FOR ALL
  USING (FALSE);

-- Only system can view rotation logs
CREATE POLICY "System views rotation logs"
  ON key_rotation_logs FOR SELECT
  USING (FALSE);

-- Organization admins can manage API keys
CREATE POLICY "Organization admins manage API keys"
  ON organization_api_keys FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_api_keys.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

-- Function to track API key usage
CREATE OR REPLACE FUNCTION track_api_key_usage(p_key_id TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE organization_api_keys
  SET last_used_at = NOW()
  WHERE key_id = p_key_id
  AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to validate API key
CREATE OR REPLACE FUNCTION validate_api_key(p_api_key TEXT)
RETURNS TABLE (
  organization_id UUID,
  permissions TEXT[],
  rate_limit INTEGER
) AS $$
DECLARE
  v_key_parts TEXT[];
  v_key_id TEXT;
BEGIN
  -- Extract key ID from API key format: hj_timestamp_random
  v_key_parts := string_to_array(p_api_key, '_');
  IF array_length(v_key_parts, 1) >= 2 THEN
    v_key_id := v_key_parts[1] || '_' || v_key_parts[2];
  ELSE
    RETURN;
  END IF;

  -- Return organization details if key is valid
  RETURN QUERY
  SELECT 
    oak.organization_id,
    oak.permissions,
    oak.rate_limit
  FROM organization_api_keys oak
  WHERE oak.key_id = v_key_id
  AND oak.is_active = TRUE
  AND (oak.expires_at IS NULL OR oak.expires_at > NOW());
END;
$$ LANGUAGE plpgsql;

-- Initial system keys
INSERT INTO rotatable_keys (id, version, type, name, value, status) VALUES
  ('system-jwt-secret', 1, 'jwt_secret', 'System JWT Secret', 'encrypted_value_here', 'active'),
  ('system-encryption-key', 1, 'encryption_key', 'System Encryption Key', 'encrypted_value_here', 'active')
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE rotatable_keys IS 'Manages cryptographic keys with automatic rotation';
COMMENT ON TABLE key_rotation_logs IS 'Audit trail for key rotation events';
COMMENT ON TABLE organization_api_keys IS 'API keys for programmatic access to organization data';