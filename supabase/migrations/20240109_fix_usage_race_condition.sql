-- Fix race condition in usage tracking with advisory locks
-- This migration updates the increment_usage_if_allowed function to use advisory locks

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
    v_lock_key BIGINT;
    v_result BOOLEAN := FALSE;
BEGIN
    -- Create a unique lock key based on org_id and mode
    -- Use hashtext to convert UUID and mode to a bigint for advisory lock
    v_lock_key := hashtext(p_org_id::TEXT || ':' || p_mode)::BIGINT;
    
    -- Acquire exclusive advisory lock for this org/mode combination
    -- This prevents concurrent executions for the same org/mode
    PERFORM pg_advisory_xact_lock(v_lock_key);
    
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
    WHERE id = p_org_id
    FOR UPDATE; -- Lock the organization row
    
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
    
    -- Get current usage from summary table for better performance
    SELECT COALESCE(total_minutes, 0)
    INTO v_current_usage
    FROM usage_summary
    WHERE organization_id = p_org_id
        AND mode = p_mode
        AND billing_period_start = v_billing_period_start
    FOR UPDATE; -- Lock the summary row
    
    -- If no summary exists, calculate from logs
    IF NOT FOUND THEN
        SELECT COALESCE(SUM(minutes_used), 0)
        INTO v_current_usage
        FROM usage_logs
        WHERE organization_id = p_org_id
            AND mode = p_mode
            AND created_at >= v_billing_period_start
            AND created_at <= v_billing_period_end;
    END IF;
    
    -- Check if usage would exceed limit
    IF v_current_usage + p_amount > v_limit THEN
        -- Log the attempt for monitoring
        INSERT INTO usage_limit_exceeded_logs (
            organization_id,
            mode,
            attempted_minutes,
            current_usage,
            limit_amount,
            created_at
        ) VALUES (
            p_org_id,
            p_mode,
            p_amount,
            v_current_usage,
            v_limit,
            NOW()
        );
        
        RETURN FALSE;
    END IF;
    
    -- Record usage in transaction
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
    
    -- Update cached usage count atomically
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
    
    v_result := TRUE;
    
    -- Advisory lock is automatically released at end of transaction
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error for monitoring
        INSERT INTO usage_tracking_errors (
            organization_id,
            mode,
            error_message,
            error_detail,
            created_at
        ) VALUES (
            p_org_id,
            p_mode,
            SQLERRM,
            SQLSTATE,
            NOW()
        );
        
        -- Re-raise the exception
        RAISE;
END;
$$;

-- Create table for exceeded limit logs
CREATE TABLE IF NOT EXISTS usage_limit_exceeded_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    mode TEXT NOT NULL,
    attempted_minutes INTEGER NOT NULL,
    current_usage INTEGER NOT NULL,
    limit_amount INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create table for error logs
CREATE TABLE IF NOT EXISTS usage_tracking_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID,
    mode TEXT,
    error_message TEXT NOT NULL,
    error_detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for monitoring
CREATE INDEX idx_usage_limit_exceeded_org_time 
ON usage_limit_exceeded_logs(organization_id, created_at DESC);

CREATE INDEX idx_usage_tracking_errors_time 
ON usage_tracking_errors(created_at DESC);

-- Add missing index for usage_logs query performance
CREATE INDEX IF NOT EXISTS idx_usage_logs_org_mode_created 
ON usage_logs(organization_id, mode, created_at DESC);

-- Function to clean up old logs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_usage_logs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    -- Delete logs older than 6 months
    DELETE FROM usage_logs
    WHERE created_at < NOW() - INTERVAL '6 months';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    -- Delete old error logs
    DELETE FROM usage_tracking_errors
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    -- Delete old exceeded logs
    DELETE FROM usage_limit_exceeded_logs
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    RETURN v_deleted_count;
END;
$$;

-- Grant permissions
GRANT SELECT ON usage_limit_exceeded_logs TO authenticated;
GRANT SELECT ON usage_tracking_errors TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_usage_logs TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION increment_usage_if_allowed IS 
'Thread-safe function to increment usage with advisory locks to prevent race conditions. Returns TRUE if usage was recorded, FALSE if limit exceeded.';