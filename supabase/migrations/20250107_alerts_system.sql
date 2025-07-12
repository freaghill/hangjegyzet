-- Create alerts table for monitoring system
CREATE TABLE IF NOT EXISTS alerts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('anomaly', 'limit_reached', 'system', 'security')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamp with time zone,
  notifications_sent text[] DEFAULT '{}',
  CONSTRAINT valid_resolved CHECK (
    (resolved = false AND resolved_at IS NULL) OR 
    (resolved = true AND resolved_at IS NOT NULL)
  )
);

-- Create indexes for efficient querying
CREATE INDEX idx_alerts_organization ON alerts(organization_id);
CREATE INDEX idx_alerts_severity ON alerts(severity) WHERE resolved = false;
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_alerts_active ON alerts(organization_id, resolved) WHERE resolved = false;

-- Add webhook URL to organizations for alert notifications
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS webhook_url text,
ADD COLUMN IF NOT EXISTS alert_settings jsonb DEFAULT '{
  "email_enabled": true,
  "slack_enabled": false,
  "webhook_enabled": false,
  "severity_threshold": "medium"
}'::jsonb;

-- Create alert_history table for audit trail
CREATE TABLE IF NOT EXISTS alert_history (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  alert_id uuid NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  action text NOT NULL,
  actor_id uuid REFERENCES profiles(id),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Function to automatically track alert resolution
CREATE OR REPLACE FUNCTION track_alert_resolution()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.resolved = true AND OLD.resolved = false THEN
    INSERT INTO alert_history (alert_id, action, details)
    VALUES (
      NEW.id,
      'resolved',
      jsonb_build_object(
        'resolved_at', NEW.resolved_at,
        'metadata', NEW.metadata
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_alert_resolution
AFTER UPDATE ON alerts
FOR EACH ROW
WHEN (OLD.resolved IS DISTINCT FROM NEW.resolved)
EXECUTE FUNCTION track_alert_resolution();

-- RLS policies for alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view all alerts
CREATE POLICY "Admins can view all alerts" ON alerts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Organizations can view their own alerts
CREATE POLICY "Organizations can view own alerts" ON alerts
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Only system can create/update alerts
CREATE POLICY "System can manage alerts" ON alerts
  FOR ALL
  USING (auth.uid() IS NULL)
  WITH CHECK (auth.uid() IS NULL);

-- Grant permissions
GRANT SELECT ON alerts TO authenticated;
GRANT SELECT ON alert_history TO authenticated;

-- Create cron job for automated anomaly detection (if pg_cron is available)
-- This would run every 5 minutes to check for anomalies
-- SELECT cron.schedule('anomaly-detection', '*/5 * * * *', $$
--   SELECT detect_anomalies_for_all_orgs();
-- $$);

COMMENT ON TABLE alerts IS 'System alerts for usage anomalies and limit violations';
COMMENT ON COLUMN alerts.type IS 'Type of alert: anomaly, limit_reached, system, security';
COMMENT ON COLUMN alerts.severity IS 'Alert severity: low, medium, high, critical';
COMMENT ON COLUMN alerts.metadata IS 'Additional context data for the alert';
COMMENT ON COLUMN alerts.notifications_sent IS 'List of notification channels used';

COMMENT ON TABLE alert_history IS 'Audit trail for alert actions';
COMMENT ON COLUMN organizations.webhook_url IS 'URL for sending webhook notifications';
COMMENT ON COLUMN organizations.alert_settings IS 'Alert notification preferences';