-- Google Calendar integrations table
CREATE TABLE google_calendar_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMPTZ,
    calendars JSONB DEFAULT '[]', -- Array of selected calendar IDs and names
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_calendar_user (user_id),
    INDEX idx_calendar_org (organization_id),
    
    -- Unique constraint
    UNIQUE(user_id, organization_id)
);

-- Calendar events table for synced events
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    calendar_id TEXT NOT NULL, -- Google Calendar ID
    event_id TEXT NOT NULL, -- Google Event ID
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    attendees JSONB DEFAULT '[]',
    location TEXT,
    meeting_link TEXT,
    recurring_event_id TEXT, -- For recurring events
    is_recurring BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_events_org (organization_id),
    INDEX idx_events_meeting (meeting_id),
    INDEX idx_events_start (start_time),
    INDEX idx_events_google (event_id),
    
    -- Unique constraint
    UNIQUE(organization_id, event_id)
);

-- Add calendar_event_id to meetings for linking
ALTER TABLE meetings 
ADD COLUMN calendar_event_id UUID REFERENCES calendar_events(id) ON DELETE SET NULL,
ADD COLUMN calendar_metadata JSONB DEFAULT '{}';

-- Add index for calendar lookups
CREATE INDEX idx_meetings_calendar_event ON meetings(calendar_event_id);

-- Enable RLS
ALTER TABLE google_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_calendar_integrations
CREATE POLICY "Users can view their calendar integration" ON google_calendar_integrations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their calendar integration" ON google_calendar_integrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their calendar integration" ON google_calendar_integrations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their calendar integration" ON google_calendar_integrations
    FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for calendar_events
CREATE POLICY "Users can view calendar events in their organization" ON calendar_events
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create calendar events in their organization" ON calendar_events
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update calendar events in their organization" ON calendar_events
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can delete calendar events in their organization" ON calendar_events
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Trigger to update updated_at
CREATE TRIGGER update_google_calendar_integrations_updated_at BEFORE UPDATE ON google_calendar_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();