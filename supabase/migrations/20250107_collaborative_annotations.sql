-- Create annotations table
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp_seconds FLOAT NOT NULL, -- Position in the transcript
    content TEXT NOT NULL,
    is_action_item BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_annotations_meeting (meeting_id),
    INDEX idx_annotations_user (user_id),
    INDEX idx_annotations_timestamp (meeting_id, timestamp_seconds)
);

-- Create annotation threads for discussions
CREATE TABLE annotation_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id UUID NOT NULL REFERENCES annotations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_threads_annotation (annotation_id),
    INDEX idx_threads_created (created_at)
);

-- Create mentions table for @mentions tracking
CREATE TABLE annotation_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    annotation_id UUID REFERENCES annotations(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES annotation_threads(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mentioned_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure either annotation_id or thread_id is set
    CHECK ((annotation_id IS NOT NULL AND thread_id IS NULL) OR (annotation_id IS NULL AND thread_id IS NOT NULL)),
    
    -- Indexes
    INDEX idx_mentions_user (mentioned_user_id),
    INDEX idx_mentions_notified (mentioned_user_id, notified)
);

-- Create presence tracking for real-time collaboration
CREATE TABLE meeting_presence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    current_position FLOAT, -- Current position in seconds they're viewing
    
    -- Unique constraint
    UNIQUE(meeting_id, user_id),
    
    -- Indexes
    INDEX idx_presence_meeting (meeting_id),
    INDEX idx_presence_last_seen (last_seen)
);

-- Enable RLS
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotation_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_presence ENABLE ROW LEVEL SECURITY;

-- Annotations policies
CREATE POLICY "Users can view annotations in their organization's meetings" ON annotations
    FOR SELECT USING (
        meeting_id IN (
            SELECT m.id FROM meetings m
            WHERE m.organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create annotations in their organization's meetings" ON annotations
    FOR INSERT WITH CHECK (
        meeting_id IN (
            SELECT m.id FROM meetings m
            WHERE m.organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        ) AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own annotations" ON annotations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own annotations" ON annotations
    FOR DELETE USING (user_id = auth.uid());

-- Annotation threads policies
CREATE POLICY "Users can view threads in their organization's meetings" ON annotation_threads
    FOR SELECT USING (
        annotation_id IN (
            SELECT a.id FROM annotations a
            JOIN meetings m ON a.meeting_id = m.id
            WHERE m.organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create threads in their organization's meetings" ON annotation_threads
    FOR INSERT WITH CHECK (
        annotation_id IN (
            SELECT a.id FROM annotations a
            JOIN meetings m ON a.meeting_id = m.id
            WHERE m.organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        ) AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own threads" ON annotation_threads
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own threads" ON annotation_threads
    FOR DELETE USING (user_id = auth.uid());

-- Mentions policies
CREATE POLICY "Users can view mentions for them" ON annotation_mentions
    FOR SELECT USING (
        mentioned_user_id = auth.uid() OR mentioned_by_user_id = auth.uid()
    );

CREATE POLICY "Users can create mentions in their organization" ON annotation_mentions
    FOR INSERT WITH CHECK (
        mentioned_by_user_id = auth.uid() AND
        mentioned_user_id IN (
            SELECT id FROM profiles WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Presence policies
CREATE POLICY "Users can view presence in their organization's meetings" ON meeting_presence
    FOR SELECT USING (
        meeting_id IN (
            SELECT m.id FROM meetings m
            WHERE m.organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own presence" ON meeting_presence
    FOR INSERT WITH CHECK (user_id = auth.uid())
    FOR UPDATE USING (user_id = auth.uid())
    FOR DELETE USING (user_id = auth.uid());

-- Function to handle annotation updates
CREATE OR REPLACE FUNCTION handle_annotation_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_annotations_updated_at BEFORE UPDATE ON annotations
    FOR EACH ROW EXECUTE FUNCTION handle_annotation_update();
    
CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON annotation_threads
    FOR EACH ROW EXECUTE FUNCTION handle_annotation_update();

-- Function to clean up old presence records
CREATE OR REPLACE FUNCTION cleanup_old_presence()
RETURNS void AS $$
BEGIN
    DELETE FROM meeting_presence
    WHERE last_seen < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add annotation count to meetings for quick access
ALTER TABLE meetings ADD COLUMN annotation_count INTEGER DEFAULT 0;

-- Function to update annotation count
CREATE OR REPLACE FUNCTION update_annotation_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE meetings SET annotation_count = annotation_count + 1 WHERE id = NEW.meeting_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE meetings SET annotation_count = annotation_count - 1 WHERE id = OLD.meeting_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update annotation count
CREATE TRIGGER update_meeting_annotation_count
    AFTER INSERT OR DELETE ON annotations
    FOR EACH ROW EXECUTE FUNCTION update_annotation_count();