-- Add missing performance indexes identified during security review
-- These indexes will significantly improve query performance

-- 1. Index on users.role for admin checks and role-based queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Composite index on meetings for user's meetings with status filter
CREATE INDEX IF NOT EXISTS idx_meetings_user_status ON meetings(user_id, status)
WHERE status IN ('processing', 'completed', 'failed');

-- 3. Index on team_members for efficient team member lookups
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- 4. Index on organization_members for organization access checks
CREATE INDEX IF NOT EXISTS idx_organization_members_user_org ON organization_members(user_id, organization_id);

-- 5. GIN index on meetings.metadata for JSONB queries
CREATE INDEX IF NOT EXISTS idx_meetings_metadata_gin ON meetings USING gin (metadata);

-- 6. Index on meetings for organization dashboard queries
CREATE INDEX IF NOT EXISTS idx_meetings_org_created ON meetings(organization_id, created_at DESC);

-- 7. Index on action_items for user's assigned tasks
CREATE INDEX IF NOT EXISTS idx_action_items_assignee ON action_items(assignee_id, status)
WHERE status != 'completed';

-- 8. Index on transcripts for quick status checks
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting_status ON transcripts(meeting_id, status);

-- 9. Index on usage_records for billing queries
CREATE INDEX IF NOT EXISTS idx_usage_records_org_created ON usage_records(organization_id, created_at DESC);

-- 10. Index on audit_logs for security monitoring
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, created_at DESC);

-- 11. Partial index on payments for active subscriptions
CREATE INDEX IF NOT EXISTS idx_payments_subscription_active ON payments(subscription_id, created_at DESC)
WHERE status = 'succeeded';

-- 12. Index on notifications for unread user notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC)
WHERE read_at IS NULL;

-- Update table statistics for query planner
ANALYZE users;
ANALYZE meetings;
ANALYZE team_members;
ANALYZE organization_members;
ANALYZE action_items;
ANALYZE transcripts;
ANALYZE usage_records;
ANALYZE audit_logs;
ANALYZE payments;
ANALYZE notifications;

-- Add comment explaining index purpose
COMMENT ON INDEX idx_users_role IS 'Speeds up admin authentication and role-based access control';
COMMENT ON INDEX idx_meetings_user_status IS 'Optimizes user dashboard queries with status filtering';
COMMENT ON INDEX idx_team_members_user_id IS 'Improves team member lookup performance';
COMMENT ON INDEX idx_organization_members_user_org IS 'Speeds up organization access verification';
COMMENT ON INDEX idx_meetings_metadata_gin IS 'Enables fast JSONB queries on meeting metadata';
COMMENT ON INDEX idx_meetings_org_created IS 'Optimizes organization dashboard and analytics queries';
COMMENT ON INDEX idx_action_items_assignee IS 'Speeds up user task list queries';
COMMENT ON INDEX idx_transcripts_meeting_status IS 'Improves transcript status checking';
COMMENT ON INDEX idx_usage_records_org_created IS 'Optimizes billing and usage queries';
COMMENT ON INDEX idx_audit_logs_user_action IS 'Speeds up security audit queries';
COMMENT ON INDEX idx_payments_subscription_active IS 'Improves subscription payment queries';
COMMENT ON INDEX idx_notifications_user_unread IS 'Speeds up unread notification counts';