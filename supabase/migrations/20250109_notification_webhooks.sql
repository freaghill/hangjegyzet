-- Notification webhook configurations
CREATE TABLE notification_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('slack', 'teams')),
    webhook_url TEXT NOT NULL,
    channel VARCHAR(255), -- Optional channel/team override
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}', -- Additional configuration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_webhooks_org (organization_id),
    INDEX idx_webhooks_type (type),
    INDEX idx_webhooks_active (is_active)
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_id UUID REFERENCES notification_webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT true,
    filters JSONB DEFAULT '{}', -- e.g., {"min_duration": 300, "keywords": ["urgent", "action"]}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, webhook_id, event_type),
    INDEX idx_prefs_org (organization_id),
    INDEX idx_prefs_webhook (webhook_id),
    INDEX idx_prefs_event (event_type)
);

-- Notification log for tracking sent notifications
CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    webhook_id UUID REFERENCES notification_webhooks(id) ON DELETE SET NULL,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL,
    response JSONB,
    error TEXT,
    retries INTEGER DEFAULT 0,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_log_org (organization_id),
    INDEX idx_log_meeting (meeting_id),
    INDEX idx_log_status (status),
    INDEX idx_log_created (created_at DESC)
);

-- Event types enum-like check
ALTER TABLE notification_preferences
ADD CONSTRAINT check_event_type CHECK (
    event_type IN (
        'meeting_completed',
        'meeting_failed',
        'action_items_created',
        'user_mentioned',
        'highlight_created',
        'transcription_ready',
        'summary_ready'
    )
);

-- RLS policies
ALTER TABLE notification_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Webhook policies
CREATE POLICY "Users can view their organization's webhooks" ON notification_webhooks
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage their organization's webhooks" ON notification_webhooks
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Preference policies
CREATE POLICY "Users can view their organization's notification preferences" ON notification_preferences
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage their organization's notification preferences" ON notification_preferences
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Log policies (read-only for users)
CREATE POLICY "Users can view their organization's notification logs" ON notification_log
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Triggers for updated_at
CREATE TRIGGER update_notification_webhooks_updated_at 
    BEFORE UPDATE ON notification_webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to send notification (called from application)
CREATE OR REPLACE FUNCTION log_notification(
    p_organization_id UUID,
    p_webhook_id UUID,
    p_meeting_id UUID,
    p_event_type VARCHAR,
    p_payload JSONB
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO notification_log (
        organization_id,
        webhook_id,
        meeting_id,
        event_type,
        payload,
        status
    ) VALUES (
        p_organization_id,
        p_webhook_id,
        p_meeting_id,
        p_event_type,
        p_payload,
        'pending'
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update notification status
CREATE OR REPLACE FUNCTION update_notification_status(
    p_log_id UUID,
    p_status VARCHAR,
    p_response JSONB DEFAULT NULL,
    p_error TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
    UPDATE notification_log
    SET 
        status = p_status,
        response = p_response,
        error = p_error,
        sent_at = CASE WHEN p_status = 'sent' THEN NOW() ELSE sent_at END,
        retries = CASE WHEN p_status = 'retrying' THEN retries + 1 ELSE retries END
    WHERE id = p_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;