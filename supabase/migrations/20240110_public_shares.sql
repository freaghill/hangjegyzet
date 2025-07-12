-- Create public_shares table for no-login meeting sharing
CREATE TABLE public_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    share_token VARCHAR(32) UNIQUE NOT NULL,
    password_hash TEXT,
    expires_at TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,
    max_views INTEGER,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_viewed_at TIMESTAMPTZ,
    
    -- Indexes
    INDEX idx_share_token (share_token),
    INDEX idx_expires_at (expires_at)
);

-- Enable RLS
ALTER TABLE public_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own shares
CREATE POLICY "Users can view own shares" ON public_shares
    FOR SELECT
    USING (created_by = auth.uid());

-- Users can create shares for meetings they have access to
CREATE POLICY "Users can create shares" ON public_shares
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM meetings m
            WHERE m.id = meeting_id
            AND (
                m.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM profiles p
                    WHERE p.id = auth.uid()
                    AND p.organization_id = m.organization_id
                )
            )
        )
    );

-- Users can update their own shares
CREATE POLICY "Users can update own shares" ON public_shares
    FOR UPDATE
    USING (created_by = auth.uid());

-- Users can delete their own shares
CREATE POLICY "Users can delete own shares" ON public_shares
    FOR DELETE
    USING (created_by = auth.uid());

-- Public access policy for share links (no auth required)
CREATE POLICY "Public can view active shares" ON public_shares
    FOR SELECT
    USING (
        (expires_at IS NULL OR expires_at > NOW())
        AND (max_views IS NULL OR view_count < max_views)
    );

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_share_view_count(share_token_param VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE public_shares
    SET 
        view_count = view_count + 1,
        last_viewed_at = NOW()
    WHERE share_token = share_token_param
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_views IS NULL OR view_count < max_views);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;