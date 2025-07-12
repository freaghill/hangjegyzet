-- Atomic usage increment function
CREATE OR REPLACE FUNCTION increment_usage_if_allowed(
    p_org_id UUID,
    p_mode TEXT,
    p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_usage INTEGER;
    v_limit INTEGER;
    v_billing_period_start DATE;
    v_billing_period_end DATE;
    v_subscription_tier TEXT;
    v_mode_allocation JSONB;
BEGIN
    -- Get organization's subscription info and mode allocation
    SELECT 
        subscription_tier,
        mode_allocation,
        DATE_TRUNC('month', CURRENT_DATE) as period_start,
        DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day' as period_end
    INTO 
        v_subscription_tier,
        v_mode_allocation,
        v_billing_period_start,
        v_billing_period_end
    FROM organizations
    WHERE id = p_org_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found';
    END IF;
    
    -- Get limit for the requested mode
    v_limit := COALESCE((v_mode_allocation->>p_mode)::INTEGER, 0);
    
    -- Check for unlimited (-1)
    IF v_limit = -1 THEN
        -- Unlimited usage, just record it
        INSERT INTO usage_logs (
            organization_id,
            mode,
            minutes_used,
            created_at
        ) VALUES (
            p_org_id,
            p_mode,
            p_amount,
            NOW()
        );
        
        RETURN TRUE;
    END IF;
    
    -- Get current usage for this billing period
    SELECT COALESCE(SUM(minutes_used), 0)
    INTO v_current_usage
    FROM usage_logs
    WHERE organization_id = p_org_id
        AND mode = p_mode
        AND created_at >= v_billing_period_start
        AND created_at <= v_billing_period_end;
    
    -- Check if usage would exceed limit
    IF v_current_usage + p_amount > v_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Record usage
    INSERT INTO usage_logs (
        organization_id,
        mode,
        minutes_used,
        created_at
    ) VALUES (
        p_org_id,
        p_mode,
        p_amount,
        NOW()
    );
    
    -- Update cached usage count for performance
    INSERT INTO usage_summary (
        organization_id,
        mode,
        billing_period_start,
        total_minutes,
        last_updated
    ) VALUES (
        p_org_id,
        p_mode,
        v_billing_period_start,
        p_amount,
        NOW()
    )
    ON CONFLICT (organization_id, mode, billing_period_start)
    DO UPDATE SET
        total_minutes = usage_summary.total_minutes + p_amount,
        last_updated = NOW();
    
    RETURN TRUE;
END;
$$;

-- Create usage summary table for performance
CREATE TABLE IF NOT EXISTS usage_summary (
    organization_id UUID NOT NULL REFERENCES organizations(id),
    mode TEXT NOT NULL,
    billing_period_start DATE NOT NULL,
    total_minutes INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    PRIMARY KEY (organization_id, mode, billing_period_start)
);

-- Index for fast lookups
CREATE INDEX idx_usage_summary_lookup 
ON usage_summary(organization_id, billing_period_start);

-- Function to get current usage
CREATE OR REPLACE FUNCTION get_current_usage(
    p_org_id UUID,
    p_billing_period_start DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_usage JSONB;
BEGIN
    SELECT jsonb_object_agg(mode, total_minutes)
    INTO v_usage
    FROM usage_summary
    WHERE organization_id = p_org_id
        AND billing_period_start = p_billing_period_start;
    
    -- Return empty object if no usage
    RETURN COALESCE(v_usage, '{}'::JSONB);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION increment_usage_if_allowed TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_usage TO authenticated;

-- RLS for usage_summary
ALTER TABLE usage_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's usage"
    ON usage_summary FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM profiles 
            WHERE id = auth.uid()
        )
    );