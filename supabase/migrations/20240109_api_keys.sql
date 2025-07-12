-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_preview TEXT NOT NULL, -- First 8 chars of the key for identification
  permissions JSONB DEFAULT '{"meetings": ["read", "write"], "transcripts": ["read"]}'::jsonb,
  rate_limit INTEGER DEFAULT 1000, -- Requests per hour
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- Create API logs table
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for logs
CREATE INDEX idx_api_logs_key ON api_logs(api_key_id);
CREATE INDEX idx_api_logs_created ON api_logs(created_at DESC);

-- Function to verify API key
CREATE OR REPLACE FUNCTION verify_api_key(p_key_hash TEXT)
RETURNS TABLE (
  organization_id UUID,
  permissions JSONB,
  rate_limit INTEGER
) AS $$
DECLARE
  v_api_key_id UUID;
BEGIN
  -- Find active, non-expired key
  SELECT 
    k.id,
    k.organization_id,
    k.permissions,
    k.rate_limit
  INTO 
    v_api_key_id,
    organization_id,
    permissions,
    rate_limit
  FROM api_keys k
  WHERE k.key_hash = p_key_hash
    AND k.is_active = true
    AND (k.expires_at IS NULL OR k.expires_at > CURRENT_TIMESTAMP);
  
  -- If key found, update last used
  IF v_api_key_id IS NOT NULL THEN
    UPDATE api_keys 
    SET last_used_at = CURRENT_TIMESTAMP 
    WHERE id = v_api_key_id;
    
    RETURN NEXT;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_api_rate_limit(
  p_api_key_id UUID,
  p_rate_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_request_count INTEGER;
BEGIN
  -- Count requests in the last hour
  SELECT COUNT(*)
  INTO v_request_count
  FROM api_logs
  WHERE api_key_id = p_api_key_id
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour';
  
  RETURN v_request_count < p_rate_limit;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- Only organization admins can manage API keys
CREATE POLICY "Organization admins can manage API keys" ON api_keys
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
  );

-- Organization members can view API logs
CREATE POLICY "Organization members can view API logs" ON api_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON api_keys TO authenticated;
GRANT INSERT, UPDATE, DELETE ON api_keys TO authenticated;
GRANT SELECT ON api_logs TO authenticated;
GRANT EXECUTE ON FUNCTION verify_api_key TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_api_rate_limit TO anon, authenticated;