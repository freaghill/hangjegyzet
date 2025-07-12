-- Add function to get current month usage
-- This function is used by the mode-status API endpoint

CREATE OR REPLACE FUNCTION get_current_month_usage(p_organization_id uuid)
RETURNS TABLE(
  fast_minutes integer,
  balanced_minutes integer,
  precision_minutes integer
) AS $$
DECLARE
  v_month date;
BEGIN
  -- Get first day of current month
  v_month := date_trunc('month', CURRENT_DATE)::date;
  
  RETURN QUERY
  SELECT 
    COALESCE(mu.fast_minutes, 0) as fast_minutes,
    COALESCE(mu.balanced_minutes, 0) as balanced_minutes,
    COALESCE(mu.precision_minutes, 0) as precision_minutes
  FROM mode_usage mu
  WHERE mu.organization_id = p_organization_id 
    AND mu.month = v_month
  UNION ALL
  SELECT 0, 0, 0  -- Default if no record exists
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_current_month_usage IS 'Returns the current month usage for all transcription modes';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_current_month_usage TO authenticated;