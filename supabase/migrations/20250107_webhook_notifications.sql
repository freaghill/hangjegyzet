-- Create table to track webhook notifications sent
CREATE TABLE IF NOT EXISTS webhook_notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  notification_key text NOT NULL, -- Unique key to prevent duplicate notifications
  sent_at timestamp with time zone DEFAULT now(),
  UNIQUE(notification_key)
);

-- Create index for efficient lookups
CREATE INDEX idx_webhook_notifications_org ON webhook_notifications(organization_id);
CREATE INDEX idx_webhook_notifications_sent ON webhook_notifications(sent_at);

-- Clean up old notifications (older than 3 months)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_notifications
  WHERE sent_at < NOW() - INTERVAL '3 months';
END;
$$ LANGUAGE plpgsql;

-- Add webhook test results to organizations
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS webhook_last_test timestamp with time zone,
ADD COLUMN IF NOT EXISTS webhook_last_test_status text;

COMMENT ON TABLE webhook_notifications IS 'Tracks sent webhook notifications to prevent duplicates';
COMMENT ON COLUMN webhook_notifications.notification_key IS 'Unique key format: org_id:mode:threshold:month';
COMMENT ON COLUMN organizations.webhook_last_test IS 'Timestamp of last webhook test';
COMMENT ON COLUMN organizations.webhook_last_test_status IS 'Status of last webhook test (success/failed)';