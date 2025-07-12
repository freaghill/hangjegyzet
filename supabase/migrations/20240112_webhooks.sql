-- Webhook configurations table
CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  failure_count INTEGER DEFAULT 0,
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  event TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  attempts INTEGER DEFAULT 0,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMPTZ,
  next_retry TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_webhook_configs_organization ON webhook_configs(organization_id);
CREATE INDEX idx_webhook_configs_active ON webhook_configs(active) WHERE active = true;
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry) WHERE status = 'failed' AND next_retry IS NOT NULL;

-- Enable RLS
ALTER TABLE webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Organizations can manage their own webhooks
CREATE POLICY "Organizations can manage own webhooks"
  ON webhook_configs FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Organizations can view their webhook deliveries
CREATE POLICY "Organizations can view own deliveries"
  ON webhook_deliveries FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM webhook_configs
      WHERE organization_id IN (
        SELECT organization_id FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- Only system can insert deliveries
CREATE POLICY "System can insert deliveries"
  ON webhook_deliveries FOR INSERT
  WITH CHECK (true);

-- Function to clean up old webhook deliveries
CREATE OR REPLACE FUNCTION cleanup_webhook_deliveries(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_deliveries
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
  AND status IN ('success', 'failed');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated at trigger
CREATE TRIGGER update_webhook_configs_updated_at
  BEFORE UPDATE ON webhook_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE webhook_configs IS 'Webhook configurations for automation and integrations';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery logs and retry tracking';