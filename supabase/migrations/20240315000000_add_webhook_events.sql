-- Webhook events table for idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'processing',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB,
    
    -- Indexes for performance
    CONSTRAINT valid_status CHECK (status IN ('processing', 'completed', 'failed'))
);

-- Index for cleanup queries
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);

-- Function to auto-cleanup old events
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
    DELETE FROM webhook_events
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Optional: Set up a cron job to run cleanup daily
-- SELECT cron.schedule('cleanup-webhook-events', '0 2 * * *', 'SELECT cleanup_old_webhook_events();');