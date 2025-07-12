-- Add subscription cancellation tracking
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS subscription_cancelled_at TIMESTAMPTZ;

-- Create subscription history table
CREATE TABLE IF NOT EXISTS subscription_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'upgraded', 'downgraded', 'cancelled', 'renewed'
    from_tier subscription_tier,
    to_tier subscription_tier,
    user_id UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subscription_history_org ON subscription_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created ON subscription_history(created_at DESC);

-- Add RLS policies
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can view their subscription history" ON subscription_history
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Only allow inserts from service role (backend only)
CREATE POLICY "Service role can insert subscription history" ON subscription_history
    FOR INSERT
    TO service_role
    WITH CHECK (true);