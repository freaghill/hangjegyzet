-- Increase connection pool limits for better scalability
-- Note: This requires Supabase Pro plan or higher

-- Update pgBouncer configuration (if using Supabase CLI locally)
-- In production, this needs to be configured in Supabase Dashboard

-- Recommended settings for different VPS tiers:
-- CPX31 (4 vCPU, 8GB): max_client_conn = 100, default_pool_size = 25
-- CPX41 (8 vCPU, 16GB): max_client_conn = 200, default_pool_size = 50  
-- CPX51 (16 vCPU, 32GB): max_client_conn = 400, default_pool_size = 75

-- Create helper function to monitor connection usage
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS TABLE (
  metric TEXT,
  value BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'active_connections'::TEXT, count(*)::BIGINT
  FROM pg_stat_activity
  WHERE state = 'active'
  UNION ALL
  SELECT 'idle_connections'::TEXT, count(*)::BIGINT
  FROM pg_stat_activity
  WHERE state = 'idle'
  UNION ALL
  SELECT 'total_connections'::TEXT, count(*)::BIGINT
  FROM pg_stat_activity
  UNION ALL
  SELECT 'max_connections'::TEXT, setting::BIGINT
  FROM pg_settings
  WHERE name = 'max_connections';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_connection_stats TO authenticated;

-- Create index to improve connection query performance
CREATE INDEX IF NOT EXISTS idx_meetings_status_created 
ON meetings(status, created_at DESC) 
WHERE status IN ('processing', 'transcribed');

-- Optimize frequently accessed tables
ANALYZE meetings;
ANALYZE organizations;
ANALYZE organization_members;
ANALYZE usage_stats;

-- Add comment for documentation
COMMENT ON FUNCTION get_connection_stats() IS 'Monitor database connection usage for scaling decisions';