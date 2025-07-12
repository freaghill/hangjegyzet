-- Enable partitioning extension
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- ========================================
-- MEETINGS TABLE PARTITIONING
-- ========================================

-- Rename existing meetings table
ALTER TABLE meetings RENAME TO meetings_old;

-- Create partitioned meetings table
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER,
  status TEXT DEFAULT 'processing',
  processing_mode TEXT DEFAULT 'balanced',
  language TEXT DEFAULT 'hu',
  file_path TEXT,
  file_size BIGINT,
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMPTZ,
  error TEXT,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for the next 12 months
SELECT partman.create_parent(
  p_parent_table => 'public.meetings',
  p_control => 'created_at',
  p_type => 'range',
  p_interval => 'monthly',
  p_premake => 12
);

-- Set retention policy (keep 24 months of data)
UPDATE partman.part_config 
SET retention = '24 months',
    retention_keep_table = false
WHERE parent_table = 'public.meetings';

-- Migrate data from old table
INSERT INTO meetings 
SELECT * FROM meetings_old;

-- Recreate indexes on partitioned table
CREATE INDEX idx_meetings_organization_partition ON meetings (organization_id, created_at);
CREATE INDEX idx_meetings_created_by_partition ON meetings (created_by, created_at);
CREATE INDEX idx_meetings_status_partition ON meetings (status, created_at);

-- ========================================
-- TRANSCRIPTIONS TABLE PARTITIONING
-- ========================================

ALTER TABLE transcriptions RENAME TO transcriptions_old;

CREATE TABLE transcriptions (
  id UUID DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  content TEXT NOT NULL,
  language TEXT DEFAULT 'hu',
  confidence_score FLOAT,
  word_timestamps JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  PRIMARY KEY (id, created_at),
  FOREIGN KEY (meeting_id, created_at) REFERENCES meetings(id, created_at) ON DELETE CASCADE
) PARTITION BY RANGE (created_at);

-- Create partitions
SELECT partman.create_parent(
  p_parent_table => 'public.transcriptions',
  p_control => 'created_at',
  p_type => 'range',
  p_interval => 'monthly',
  p_premake => 12
);

-- Migrate data
INSERT INTO transcriptions 
SELECT t.*, m.created_at as meeting_created_at
FROM transcriptions_old t
JOIN meetings m ON t.meeting_id = m.id;

-- ========================================
-- MEETING_SEGMENTS TABLE PARTITIONING
-- ========================================

ALTER TABLE meeting_segments RENAME TO meeting_segments_old;

CREATE TABLE meeting_segments (
  id UUID DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL,
  speaker_id TEXT,
  content TEXT NOT NULL,
  start_time FLOAT NOT NULL,
  end_time FLOAT NOT NULL,
  confidence FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at),
  FOREIGN KEY (meeting_id, created_at) REFERENCES meetings(id, created_at) ON DELETE CASCADE
) PARTITION BY RANGE (created_at);

SELECT partman.create_parent(
  p_parent_table => 'public.meeting_segments',
  p_control => 'created_at',
  p_type => 'range',
  p_interval => 'monthly',  
  p_premake => 12
);

-- ========================================
-- ANALYTICS DATA PARTITIONING
-- ========================================

-- Create analytics events table with partitioning
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Daily partitions for analytics (high volume)
SELECT partman.create_parent(
  p_parent_table => 'public.analytics_events',
  p_control => 'created_at',
  p_type => 'range',
  p_interval => 'daily',
  p_premake => 30
);

-- Shorter retention for analytics (90 days)
UPDATE partman.part_config 
SET retention = '90 days',
    retention_keep_table = false
WHERE parent_table = 'public.analytics_events';

-- ========================================
-- AUDIT LOGS PARTITIONING
-- ========================================

CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid(),
  organization_id UUID,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

SELECT partman.create_parent(
  p_parent_table => 'public.audit_logs',
  p_control => 'created_at',
  p_type => 'range',
  p_interval => 'monthly',
  p_premake => 6
);

-- Keep audit logs for 1 year
UPDATE partman.part_config 
SET retention = '1 year',
    retention_keep_table = false
WHERE parent_table = 'public.audit_logs';

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get partition information
CREATE OR REPLACE FUNCTION get_partition_info()
RETURNS TABLE (
  table_name TEXT,
  partition_count INTEGER,
  oldest_partition DATE,
  newest_partition DATE,
  total_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH partition_info AS (
    SELECT 
      parent_table,
      COUNT(*) as partition_count,
      MIN(partition_range_lower::date) as oldest,
      MAX(partition_range_upper::date) as newest,
      pg_size_pretty(SUM(pg_relation_size(partition_schemaname||'.'||partition_tablename))) as total_size
    FROM partman.show_partitions()
    GROUP BY parent_table
  )
  SELECT 
    parent_table::TEXT,
    partition_count::INTEGER,
    oldest,
    newest,
    total_size::TEXT
  FROM partition_info;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old partitions to cold storage
CREATE OR REPLACE FUNCTION archive_old_partition(
  p_table_name TEXT,
  p_partition_name TEXT
) RETURNS VOID AS $$
DECLARE
  v_archive_path TEXT;
BEGIN
  -- Generate archive path
  v_archive_path := '/archive/' || p_table_name || '/' || p_partition_name || '.dump';
  
  -- Log the archival
  INSERT INTO audit_logs (action, resource_type, resource_id, changes)
  VALUES (
    'partition_archived',
    'partition',
    gen_random_uuid(),
    jsonb_build_object(
      'table_name', p_table_name,
      'partition_name', p_partition_name,
      'archive_path', v_archive_path
    )
  );
  
  -- In production, this would trigger an external process to:
  -- 1. Dump the partition data to S3/cold storage
  -- 2. Verify the backup
  -- 3. Drop the partition
  
  RAISE NOTICE 'Partition % archived to %', p_partition_name, v_archive_path;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- MAINTENANCE JOBS
-- ========================================

-- Schedule partition maintenance
SELECT cron.schedule(
  'partition-maintenance',
  '0 2 * * *', -- Daily at 2 AM
  $$SELECT partman.run_maintenance()$$
);

-- Schedule old partition archival
SELECT cron.schedule(
  'archive-old-partitions',
  '0 3 * * 0', -- Weekly on Sunday at 3 AM
  $$
  SELECT archive_old_partition(parent_table, partition_name)
  FROM partman.show_partitions()
  WHERE partition_range_lower::date < CURRENT_DATE - INTERVAL '2 years'
  $$
);

-- ========================================
-- MONITORING VIEWS
-- ========================================

-- View for partition sizes
CREATE OR REPLACE VIEW partition_sizes AS
SELECT 
  parent_table,
  partition_tablename,
  partition_range_lower::date as start_date,
  partition_range_upper::date as end_date,
  pg_size_pretty(pg_relation_size(partition_schemaname||'.'||partition_tablename)) as size,
  (SELECT COUNT(*) FROM meetings WHERE created_at >= partition_range_lower::date AND created_at < partition_range_upper::date) as row_count
FROM partman.show_partitions()
ORDER BY parent_table, partition_range_lower DESC;

-- View for partition performance
CREATE OR REPLACE VIEW partition_performance AS
WITH stats AS (
  SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  AND tablename LIKE '%_p%' -- Partition naming convention
)
SELECT * FROM stats
ORDER BY live_tuples DESC;

-- ========================================
-- CLEANUP
-- ========================================

-- Drop old tables after verification
-- DROP TABLE meetings_old CASCADE;
-- DROP TABLE transcriptions_old CASCADE;
-- DROP TABLE meeting_segments_old CASCADE;

COMMENT ON TABLE meetings IS 'Partitioned by month for scalable storage of meeting records';
COMMENT ON TABLE transcriptions IS 'Partitioned by month, follows parent meeting partitioning';
COMMENT ON TABLE analytics_events IS 'High-volume analytics data partitioned daily';
COMMENT ON TABLE audit_logs IS 'Security audit trail partitioned monthly';