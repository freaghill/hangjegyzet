-- MiniCRM Integration Tables

-- Store MiniCRM OAuth credentials and integration settings
CREATE TABLE minicrm_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- OAuth credentials
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry TIMESTAMPTZ,
    
    -- MiniCRM instance details
    system_id TEXT NOT NULL, -- MiniCRM system ID
    api_url TEXT NOT NULL, -- Base API URL for the MiniCRM instance
    
    -- Sync settings
    auto_sync_enabled BOOLEAN DEFAULT true,
    sync_direction VARCHAR(20) DEFAULT 'both', -- 'to_crm', 'from_crm', 'both'
    last_sync_at TIMESTAMPTZ,
    
    -- Entity mapping preferences
    default_project_id INTEGER, -- Default MiniCRM project ID for new activities
    activity_type_id INTEGER, -- MiniCRM activity type ID for meetings
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, organization_id),
    INDEX idx_minicrm_org (organization_id),
    INDEX idx_minicrm_user (user_id)
);

-- Store mapping between meetings and MiniCRM entities
CREATE TABLE minicrm_meeting_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- MiniCRM entity references
    activity_id INTEGER, -- MiniCRM activity ID
    project_id INTEGER, -- MiniCRM project ID
    contact_ids INTEGER[] DEFAULT '{}', -- Array of MiniCRM contact IDs
    company_ids INTEGER[] DEFAULT '{}', -- Array of MiniCRM company IDs
    
    -- Sync metadata
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'synced', 'failed'
    sync_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(meeting_id),
    INDEX idx_minicrm_links_meeting (meeting_id),
    INDEX idx_minicrm_links_org (organization_id),
    INDEX idx_minicrm_links_status (sync_status)
);

-- Cache for MiniCRM entities to reduce API calls
CREATE TABLE minicrm_entity_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Entity identification
    entity_type VARCHAR(50) NOT NULL, -- 'contact', 'company', 'project'
    entity_id INTEGER NOT NULL,
    
    -- Cached data
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    additional_data JSONB DEFAULT '{}',
    
    -- Cache management
    cached_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
    
    -- Constraints
    UNIQUE(organization_id, entity_type, entity_id),
    INDEX idx_minicrm_cache_org (organization_id),
    INDEX idx_minicrm_cache_type (entity_type),
    INDEX idx_minicrm_cache_expires (expires_at)
);

-- Store detected entities from meeting transcripts
CREATE TABLE minicrm_detected_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    
    -- Detection details
    entity_type VARCHAR(50) NOT NULL, -- 'person', 'company', 'email', 'phone'
    entity_value TEXT NOT NULL,
    confidence_score FLOAT DEFAULT 0.0,
    
    -- Matching results
    matched_entity_type VARCHAR(50), -- 'contact', 'company'
    matched_entity_id INTEGER,
    matched_at TIMESTAMPTZ,
    
    -- Position in transcript
    start_position INTEGER,
    end_position INTEGER,
    context TEXT, -- Surrounding text for context
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    INDEX idx_minicrm_detected_meeting (meeting_id),
    INDEX idx_minicrm_detected_type (entity_type),
    INDEX idx_minicrm_detected_matched (matched_entity_id)
);

-- Log for sync operations
CREATE TABLE minicrm_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    
    -- Sync details
    operation VARCHAR(50) NOT NULL, -- 'create_activity', 'update_activity', 'link_entities', etc.
    entity_type VARCHAR(50),
    entity_id INTEGER,
    
    -- Result
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'skipped'
    error_message TEXT,
    request_data JSONB,
    response_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    INDEX idx_minicrm_log_org (organization_id),
    INDEX idx_minicrm_log_meeting (meeting_id),
    INDEX idx_minicrm_log_created (created_at DESC)
);

-- RLS Policies

ALTER TABLE minicrm_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE minicrm_meeting_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE minicrm_entity_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE minicrm_detected_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE minicrm_sync_log ENABLE ROW LEVEL SECURITY;

-- MiniCRM integrations policies
CREATE POLICY "Users can view their MiniCRM integration" ON minicrm_integrations
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage their MiniCRM integration" ON minicrm_integrations
    FOR ALL USING (
        user_id = auth.uid() AND
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Meeting links policies
CREATE POLICY "Users can view MiniCRM links in their organization" ON minicrm_meeting_links
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can manage MiniCRM links in their organization" ON minicrm_meeting_links
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Entity cache policies
CREATE POLICY "Users can view cached entities in their organization" ON minicrm_entity_cache
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Detected entities policies
CREATE POLICY "Users can view detected entities for their meetings" ON minicrm_detected_entities
    FOR SELECT USING (
        meeting_id IN (
            SELECT id FROM meetings WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Sync log policies
CREATE POLICY "Users can view sync logs for their organization" ON minicrm_sync_log
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Functions

-- Function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_minicrm_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM minicrm_entity_cache
    WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create MiniCRM link for a meeting
CREATE OR REPLACE FUNCTION get_or_create_minicrm_link(
    p_meeting_id UUID,
    p_organization_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_link_id UUID;
BEGIN
    -- Try to get existing link
    SELECT id INTO v_link_id
    FROM minicrm_meeting_links
    WHERE meeting_id = p_meeting_id;
    
    -- Create if not exists
    IF v_link_id IS NULL THEN
        INSERT INTO minicrm_meeting_links (meeting_id, organization_id)
        VALUES (p_meeting_id, p_organization_id)
        RETURNING id INTO v_link_id;
    END IF;
    
    RETURN v_link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers

-- Update updated_at timestamp
CREATE TRIGGER update_minicrm_integrations_updated_at 
    BEFORE UPDATE ON minicrm_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_minicrm_meeting_links_updated_at 
    BEFORE UPDATE ON minicrm_meeting_links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();