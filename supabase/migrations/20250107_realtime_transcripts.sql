-- Create meeting_transcripts table for real-time transcript segments
CREATE TABLE IF NOT EXISTS meeting_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    speaker VARCHAR(255) NOT NULL,
    start_time BIGINT NOT NULL, -- Timestamp in milliseconds
    end_time BIGINT NOT NULL,   -- Timestamp in milliseconds
    confidence FLOAT DEFAULT 0.0,
    language VARCHAR(10) DEFAULT 'hu',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT valid_time_range CHECK (end_time >= start_time),
    CONSTRAINT valid_confidence CHECK (confidence >= 0 AND confidence <= 1)
);

-- Create indexes
CREATE INDEX idx_meeting_transcripts_meeting_id ON meeting_transcripts(meeting_id);
CREATE INDEX idx_meeting_transcripts_start_time ON meeting_transcripts(meeting_id, start_time);
CREATE INDEX idx_meeting_transcripts_speaker ON meeting_transcripts(meeting_id, speaker);
CREATE INDEX idx_meeting_transcripts_created_at ON meeting_transcripts(created_at);

-- Enable RLS
ALTER TABLE meeting_transcripts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view transcripts for meetings in their organization
CREATE POLICY "Users can view organization meeting transcripts" ON meeting_transcripts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 
            FROM meetings m
            JOIN profiles p ON p.organization_id = m.organization_id
            WHERE m.id = meeting_transcripts.meeting_id
            AND p.id = auth.uid()
        )
    );

-- Users can insert transcripts for meetings in their organization
CREATE POLICY "Users can insert organization meeting transcripts" ON meeting_transcripts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM meetings m
            JOIN profiles p ON p.organization_id = m.organization_id
            WHERE m.id = meeting_transcripts.meeting_id
            AND p.id = auth.uid()
        )
    );

-- Only admins can update transcripts
CREATE POLICY "Admins can update organization meeting transcripts" ON meeting_transcripts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 
            FROM meetings m
            JOIN profiles p ON p.organization_id = m.organization_id
            WHERE m.id = meeting_transcripts.meeting_id
            AND p.id = auth.uid()
            AND p.role IN ('owner', 'admin')
        )
    );

-- Only admins can delete transcripts
CREATE POLICY "Admins can delete organization meeting transcripts" ON meeting_transcripts
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 
            FROM meetings m
            JOIN profiles p ON p.organization_id = m.organization_id
            WHERE m.id = meeting_transcripts.meeting_id
            AND p.id = auth.uid()
            AND p.role IN ('owner', 'admin')
        )
    );

-- Function to automatically update meeting duration based on transcripts
CREATE OR REPLACE FUNCTION update_meeting_duration()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE meetings
    SET 
        duration_seconds = GREATEST(
            COALESCE(duration_seconds, 0),
            FLOOR((NEW.end_time - COALESCE(
                (SELECT MIN(start_time) FROM meeting_transcripts WHERE meeting_id = NEW.meeting_id),
                NEW.start_time
            )) / 1000)
        ),
        updated_at = NOW()
    WHERE id = NEW.meeting_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update meeting duration on new transcript
CREATE TRIGGER update_meeting_duration_on_transcript
    AFTER INSERT ON meeting_transcripts
    FOR EACH ROW
    EXECUTE FUNCTION update_meeting_duration();

-- Add real-time specific columns to meetings table if they don't exist
DO $$ 
BEGIN
    -- Add is_live column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meetings' 
        AND column_name = 'is_live'
    ) THEN
        ALTER TABLE meetings ADD COLUMN is_live BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add live_started_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meetings' 
        AND column_name = 'live_started_at'
    ) THEN
        ALTER TABLE meetings ADD COLUMN live_started_at TIMESTAMPTZ;
    END IF;
    
    -- Add live_ended_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meetings' 
        AND column_name = 'live_ended_at'
    ) THEN
        ALTER TABLE meetings ADD COLUMN live_ended_at TIMESTAMPTZ;
    END IF;
    
    -- Add recording_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'meetings' 
        AND column_name = 'recording_url'
    ) THEN
        ALTER TABLE meetings ADD COLUMN recording_url TEXT;
    END IF;
END $$;

-- Create index for live meetings
CREATE INDEX IF NOT EXISTS idx_meetings_is_live ON meetings(is_live) WHERE is_live = TRUE;

-- Function to mark meeting as live
CREATE OR REPLACE FUNCTION start_live_meeting(p_meeting_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE meetings
    SET 
        is_live = TRUE,
        live_started_at = NOW(),
        status = 'processing',
        updated_at = NOW()
    WHERE id = p_meeting_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end live meeting
CREATE OR REPLACE FUNCTION end_live_meeting(p_meeting_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE meetings
    SET 
        is_live = FALSE,
        live_ended_at = NOW(),
        status = 'completed',
        updated_at = NOW()
    WHERE id = p_meeting_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION start_live_meeting(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION end_live_meeting(UUID) TO authenticated;