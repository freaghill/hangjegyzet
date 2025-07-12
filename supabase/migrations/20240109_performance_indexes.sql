-- Performance optimization indexes

-- Meetings table indexes
CREATE INDEX IF NOT EXISTS idx_meetings_organization_id ON meetings(organization_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_status_org ON meetings(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at_org ON meetings(organization_id, created_at DESC);

-- Meeting transcripts indexes (for search performance)
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting_id ON meeting_transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_timestamp ON meeting_transcripts(meeting_id, timestamp);

-- Meeting insights indexes
CREATE INDEX IF NOT EXISTS idx_meeting_insights_meeting_id ON meeting_insights(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_insights_created_at ON meeting_insights(created_at DESC);

-- Organization members indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON organization_members(user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_role ON organization_members(organization_id, role);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_status ON subscriptions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires ON subscriptions(expires_at) WHERE status = 'active';

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org_month ON usage_tracking(organization_id, month);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org_type_month ON usage_tracking(organization_id, usage_type, month);

-- Annotations indexes
CREATE INDEX IF NOT EXISTS idx_annotations_meeting_id ON annotations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_annotations_user_id ON annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_annotations_meeting_user ON annotations(meeting_id, user_id);

-- Calendar events indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_org_start ON calendar_events(organization_id, start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_meeting_id ON calendar_events(meeting_id) WHERE meeting_id IS NOT NULL;

-- Integration indexes
CREATE INDEX IF NOT EXISTS idx_google_drive_int_org_user ON google_drive_integrations(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_google_cal_int_org_user ON google_calendar_integrations(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_zoom_int_org_user ON zoom_integrations(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_minicrm_int_org ON minicrm_integrations(organization_id);

-- Vocabulary indexes
CREATE INDEX IF NOT EXISTS idx_vocabulary_org_cat ON vocabulary_entries(organization_id, category);
CREATE INDEX IF NOT EXISTS idx_vocabulary_org_term ON vocabulary_entries(organization_id, term);

-- API keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_org_active ON api_keys(organization_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key_hash) WHERE is_active = true;

-- Template indexes
CREATE INDEX IF NOT EXISTS idx_templates_org_type ON meeting_templates(organization_id, template_type);
CREATE INDEX IF NOT EXISTS idx_templates_org_active ON meeting_templates(organization_id, is_active);

-- Webhook logs indexes (for debugging and monitoring)
CREATE INDEX IF NOT EXISTS idx_zoom_webhook_created ON zoom_webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_google_webhook_created ON google_drive_webhook_logs(created_at DESC);

-- Partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_meetings_active_org ON meetings(organization_id) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_meetings_processing ON meetings(created_at DESC) WHERE status = 'processing';

-- BRIN indexes for time-series data (if tables are large)
-- BRIN indexes are more space-efficient for large tables with naturally ordered data
CREATE INDEX IF NOT EXISTS idx_meetings_created_brin ON meetings USING BRIN(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_month_brin ON usage_tracking USING BRIN(month);

-- Composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_meetings_org_created_status ON meetings(organization_id, created_at DESC, status);

-- Function to analyze index usage (for monitoring)
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE (
  schemaname text,
  tablename text,
  indexname text,
  idx_scan bigint,
  idx_tup_read bigint,
  idx_tup_fetch bigint,
  size text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.schemaname::text,
    s.tablename::text,
    s.indexname::text,
    s.idx_scan,
    s.idx_tup_read,
    s.idx_tup_fetch,
    pg_size_pretty(pg_relation_size(s.indexrelid))::text as size
  FROM pg_stat_user_indexes s
  JOIN pg_index i ON s.indexrelid = i.indexrelid
  WHERE s.schemaname = 'public'
  ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_index_usage_stats() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_index_usage_stats() IS 'Returns index usage statistics for monitoring and optimization purposes';