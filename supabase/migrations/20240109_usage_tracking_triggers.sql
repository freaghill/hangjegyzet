-- Create usage_stats table to track aggregated usage
CREATE TABLE IF NOT EXISTS usage_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  transcription_minutes INTEGER DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, month)
);

-- Create indexes for performance
CREATE INDEX idx_usage_stats_org_month ON usage_stats(organization_id, month);
CREATE INDEX idx_usage_stats_user_month ON usage_stats(user_id, month);

-- Create function to update usage stats
CREATE OR REPLACE FUNCTION update_usage_stats()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  current_month DATE;
  duration_minutes INTEGER;
BEGIN
  -- Get the current month (first day)
  current_month := DATE_TRUNC('month', CURRENT_DATE);
  
  -- Get organization ID from the meeting
  SELECT organization_id INTO org_id FROM meetings WHERE id = NEW.id;
  
  -- Calculate duration in minutes
  duration_minutes := CEIL(NEW.duration_seconds::NUMERIC / 60);
  
  -- Only track completed transcriptions
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Insert or update usage stats
    INSERT INTO usage_stats (
      organization_id,
      user_id,
      month,
      transcription_minutes,
      api_calls
    ) VALUES (
      org_id,
      NEW.user_id,
      current_month,
      duration_minutes,
      1
    )
    ON CONFLICT (organization_id, month)
    DO UPDATE SET
      transcription_minutes = usage_stats.transcription_minutes + duration_minutes,
      api_calls = usage_stats.api_calls + 1,
      updated_at = CURRENT_TIMESTAMP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for meeting status updates
DROP TRIGGER IF EXISTS track_meeting_usage ON meetings;
CREATE TRIGGER track_meeting_usage
  AFTER INSERT OR UPDATE OF status ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_usage_stats();

-- Create function to track API usage
CREATE OR REPLACE FUNCTION track_api_usage(
  p_organization_id UUID,
  p_user_id UUID,
  p_endpoint TEXT,
  p_method TEXT
)
RETURNS VOID AS $$
DECLARE
  current_month DATE;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE);
  
  INSERT INTO usage_stats (
    organization_id,
    user_id,
    month,
    api_calls
  ) VALUES (
    p_organization_id,
    p_user_id,
    current_month,
    1
  )
  ON CONFLICT (organization_id, month)
  DO UPDATE SET
    api_calls = usage_stats.api_calls + 1,
    updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to track storage usage
CREATE OR REPLACE FUNCTION update_storage_usage()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  current_month DATE;
  file_size BIGINT;
BEGIN
  current_month := DATE_TRUNC('month', CURRENT_DATE);
  
  -- Get organization ID from the meeting
  SELECT organization_id INTO org_id FROM meetings WHERE id = NEW.meeting_id;
  
  -- Get file size (this assumes we store it in metadata)
  file_size := COALESCE((NEW.metadata->>'size')::BIGINT, 0);
  
  IF TG_OP = 'INSERT' THEN
    -- Add storage
    INSERT INTO usage_stats (
      organization_id,
      month,
      storage_bytes
    ) VALUES (
      org_id,
      current_month,
      file_size
    )
    ON CONFLICT (organization_id, month)
    DO UPDATE SET
      storage_bytes = usage_stats.storage_bytes + file_size,
      updated_at = CURRENT_TIMESTAMP;
  ELSIF TG_OP = 'DELETE' THEN
    -- Subtract storage
    UPDATE usage_stats
    SET 
      storage_bytes = GREATEST(0, storage_bytes - file_size),
      updated_at = CURRENT_TIMESTAMP
    WHERE organization_id = org_id AND month = current_month;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create view for current month usage
CREATE OR REPLACE VIEW current_usage AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COALESCE(u.transcription_minutes, 0) as transcription_minutes,
  COALESCE(u.api_calls, 0) as api_calls,
  COALESCE(u.storage_bytes, 0) as storage_bytes,
  s.transcription_minutes_limit,
  s.api_calls_limit,
  s.storage_gb_limit * 1024 * 1024 * 1024 as storage_bytes_limit,
  CASE 
    WHEN s.transcription_minutes_limit = -1 THEN FALSE
    ELSE COALESCE(u.transcription_minutes, 0) >= s.transcription_minutes_limit
  END as transcription_limit_reached,
  CASE 
    WHEN s.api_calls_limit = -1 THEN FALSE
    ELSE COALESCE(u.api_calls, 0) >= s.api_calls_limit
  END as api_limit_reached,
  CASE 
    WHEN s.storage_gb_limit = -1 THEN FALSE
    ELSE COALESCE(u.storage_bytes, 0) >= (s.storage_gb_limit * 1024 * 1024 * 1024)
  END as storage_limit_reached
FROM organizations o
LEFT JOIN usage_stats u ON u.organization_id = o.id 
  AND u.month = DATE_TRUNC('month', CURRENT_DATE)
LEFT JOIN subscriptions s ON s.organization_id = o.id 
  AND s.status = 'active';

-- Grant permissions
GRANT SELECT ON usage_stats TO authenticated;
GRANT SELECT ON current_usage TO authenticated;

-- Add RLS policies
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's usage" ON usage_stats
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create function to get usage for billing
CREATE OR REPLACE FUNCTION get_billing_usage(
  p_organization_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  month DATE,
  transcription_minutes INTEGER,
  api_calls INTEGER,
  storage_bytes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.month,
    u.transcription_minutes,
    u.api_calls,
    u.storage_bytes
  FROM usage_stats u
  WHERE u.organization_id = p_organization_id
    AND u.month >= p_start_date
    AND u.month <= p_end_date
  ORDER BY u.month DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;