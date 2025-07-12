-- Migration: Add mode-based usage tracking
-- Date: 2025-01-07
-- Description: Update schema to support Fast/Balanced/Precision mode tracking

-- 1. Add transcription_mode enum
CREATE TYPE transcription_mode AS ENUM ('fast', 'balanced', 'precision');

-- 2. Add mode column to meetings table
ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS transcription_mode transcription_mode DEFAULT 'balanced';

-- 3. Create mode_usage table for tracking monthly usage per mode
CREATE TABLE IF NOT EXISTS mode_usage (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  month date NOT NULL, -- First day of the month
  fast_minutes integer DEFAULT 0,
  balanced_minutes integer DEFAULT 0,
  precision_minutes integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(organization_id, month)
);

-- 4. Create index for fast lookups
CREATE INDEX idx_mode_usage_org_month ON mode_usage(organization_id, month);

-- 5. Add mode limits to subscription_history
ALTER TABLE subscription_history
ADD COLUMN IF NOT EXISTS mode_limits jsonb DEFAULT '{
  "fast": 0,
  "balanced": 0,
  "precision": 0
}'::jsonb;

-- 6. Create function to increment mode usage
CREATE OR REPLACE FUNCTION increment_mode_usage(
  p_organization_id uuid,
  p_mode transcription_mode,
  p_minutes integer
)
RETURNS void AS $$
DECLARE
  v_month date;
BEGIN
  -- Get first day of current month
  v_month := date_trunc('month', CURRENT_DATE)::date;
  
  -- Insert or update usage
  INSERT INTO mode_usage (organization_id, month, fast_minutes, balanced_minutes, precision_minutes)
  VALUES (
    p_organization_id,
    v_month,
    CASE WHEN p_mode = 'fast' THEN p_minutes ELSE 0 END,
    CASE WHEN p_mode = 'balanced' THEN p_minutes ELSE 0 END,
    CASE WHEN p_mode = 'precision' THEN p_minutes ELSE 0 END
  )
  ON CONFLICT (organization_id, month) DO UPDATE SET
    fast_minutes = mode_usage.fast_minutes + CASE WHEN p_mode = 'fast' THEN p_minutes ELSE 0 END,
    balanced_minutes = mode_usage.balanced_minutes + CASE WHEN p_mode = 'balanced' THEN p_minutes ELSE 0 END,
    precision_minutes = mode_usage.precision_minutes + CASE WHEN p_mode = 'precision' THEN p_minutes ELSE 0 END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to check mode availability
CREATE OR REPLACE FUNCTION check_mode_availability(
  p_organization_id uuid,
  p_mode transcription_mode
)
RETURNS TABLE(
  available boolean,
  used integer,
  limit_minutes integer,
  remaining integer
) AS $$
DECLARE
  v_month date;
  v_used integer;
  v_limit integer;
  v_subscription_tier text;
BEGIN
  -- Get first day of current month
  v_month := date_trunc('month', CURRENT_DATE)::date;
  
  -- Get current subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM organizations
  WHERE id = p_organization_id;
  
  -- Get current usage for the mode
  SELECT 
    CASE 
      WHEN p_mode = 'fast' THEN COALESCE(fast_minutes, 0)
      WHEN p_mode = 'balanced' THEN COALESCE(balanced_minutes, 0)
      WHEN p_mode = 'precision' THEN COALESCE(precision_minutes, 0)
    END
  INTO v_used
  FROM mode_usage
  WHERE organization_id = p_organization_id AND month = v_month;
  
  -- If no usage record, set to 0
  v_used := COALESCE(v_used, 0);
  
  -- Get limit based on subscription tier and mode
  -- These limits should match subscription-plans.ts
  v_limit := CASE v_subscription_tier
    WHEN 'trial' THEN
      CASE p_mode
        WHEN 'fast' THEN 100
        WHEN 'balanced' THEN 20
        WHEN 'precision' THEN 0
      END
    WHEN 'indulo' THEN
      CASE p_mode
        WHEN 'fast' THEN 500
        WHEN 'balanced' THEN 100
        WHEN 'precision' THEN 0
      END
    WHEN 'profi' THEN
      CASE p_mode
        WHEN 'fast' THEN 2000
        WHEN 'balanced' THEN 500
        WHEN 'precision' THEN 50
      END
    WHEN 'vallalati' THEN
      CASE p_mode
        WHEN 'fast' THEN 10000
        WHEN 'balanced' THEN 2000
        WHEN 'precision' THEN 200
      END
    WHEN 'multinational' THEN
      CASE p_mode
        WHEN 'fast' THEN -1 -- unlimited
        WHEN 'balanced' THEN 10000
        WHEN 'precision' THEN 1000
      END
    -- Legacy plan mappings
    WHEN 'starter' THEN
      CASE p_mode
        WHEN 'fast' THEN 500
        WHEN 'balanced' THEN 100
        WHEN 'precision' THEN 0
      END
    WHEN 'professional' THEN
      CASE p_mode
        WHEN 'fast' THEN 2000
        WHEN 'balanced' THEN 500
        WHEN 'precision' THEN 50
      END
    WHEN 'enterprise' THEN
      CASE p_mode
        WHEN 'fast' THEN 10000
        WHEN 'balanced' THEN 2000
        WHEN 'precision' THEN 200
      END
    ELSE 0
  END;
  
  -- Return availability info
  RETURN QUERY SELECT
    (v_limit = -1 OR v_used < v_limit) as available,
    v_used as used,
    v_limit as limit_minutes,
    CASE 
      WHEN v_limit = -1 THEN -1 
      ELSE GREATEST(0, v_limit - v_used)
    END as remaining;
END;
$$ LANGUAGE plpgsql;

-- 8. Add trigger to update mode usage when meeting is completed
CREATE OR REPLACE FUNCTION update_mode_usage_on_meeting_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status changed to 'completed'
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.duration_seconds > 0 THEN
    -- Calculate minutes (round up)
    PERFORM increment_mode_usage(
      NEW.organization_id,
      COALESCE(NEW.transcription_mode, 'balanced'),
      CEIL(NEW.duration_seconds / 60.0)::integer
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mode_usage
AFTER UPDATE OF status ON meetings
FOR EACH ROW
EXECUTE FUNCTION update_mode_usage_on_meeting_complete();

-- 9. Migrate existing usage data (assume all previous usage was 'balanced' mode)
INSERT INTO mode_usage (organization_id, month, balanced_minutes)
SELECT 
  organization_id,
  date_trunc('month', created_at)::date as month,
  SUM(CEIL(duration_seconds / 60.0))::integer as balanced_minutes
FROM meetings
WHERE status = 'completed' AND duration_seconds > 0
GROUP BY organization_id, date_trunc('month', created_at)::date
ON CONFLICT (organization_id, month) DO UPDATE SET
  balanced_minutes = mode_usage.balanced_minutes + EXCLUDED.balanced_minutes,
  updated_at = now();

-- 10. Add RLS policies
ALTER TABLE mode_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's mode usage" ON mode_usage
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "System can update mode usage" ON mode_usage
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 11. Create view for easy mode usage summary
CREATE OR REPLACE VIEW mode_usage_summary AS
SELECT 
  mu.organization_id,
  o.name as organization_name,
  mu.month,
  mu.fast_minutes,
  mu.balanced_minutes,
  mu.precision_minutes,
  mu.fast_minutes + mu.balanced_minutes + mu.precision_minutes as total_minutes,
  o.subscription_tier,
  mu.created_at,
  mu.updated_at
FROM mode_usage mu
JOIN organizations o ON mu.organization_id = o.id;

-- Grant access to the view
GRANT SELECT ON mode_usage_summary TO authenticated;

COMMENT ON TABLE mode_usage IS 'Tracks monthly usage per transcription mode for each organization';
COMMENT ON COLUMN meetings.transcription_mode IS 'The transcription mode used: fast (basic), balanced (enhanced), or precision (maximum accuracy)';
COMMENT ON FUNCTION increment_mode_usage IS 'Increments the usage counter for a specific transcription mode';
COMMENT ON FUNCTION check_mode_availability IS 'Checks if an organization can use a specific transcription mode based on their subscription limits';