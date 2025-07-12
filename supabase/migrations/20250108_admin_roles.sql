-- Add is_admin column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create admin check function
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id 
    AND (role = 'admin' OR role = 'owner' OR is_admin = TRUE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant admin access to first user (usually the developer)
UPDATE profiles 
SET is_admin = TRUE 
WHERE id = (SELECT id FROM profiles ORDER BY created_at ASC LIMIT 1);

-- Create view for admin dashboard stats
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM organizations) as total_organizations,
  (SELECT COUNT(*) FROM meetings) as total_meetings,
  (SELECT COUNT(*) FROM organizations 
   WHERE subscription_tier != 'trial' 
   AND subscription_ends_at > NOW()) as active_subscriptions,
  (SELECT COALESCE(SUM(minutes_used), 0) FROM usage_stats 
   WHERE month = DATE_TRUNC('month', NOW())) as monthly_minutes,
  (SELECT COALESCE(SUM(meetings_count), 0) FROM usage_stats 
   WHERE month = DATE_TRUNC('month', NOW())) as monthly_meetings;

-- Grant access to admin view
GRANT SELECT ON admin_dashboard_stats TO authenticated;