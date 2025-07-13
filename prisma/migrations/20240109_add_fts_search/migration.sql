-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Add tsvector column for full-text search
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create Hungarian text search configuration
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'hungarian') THEN
        CREATE TEXT SEARCH CONFIGURATION hungarian (COPY = simple);
    END IF;
END $$;

-- Create search function with accent removal
CREATE OR REPLACE FUNCTION meeting_search_vector(title text, transcript_text text, summary text, tags text[])
RETURNS tsvector AS $$
BEGIN
    RETURN 
        setweight(to_tsvector('hungarian', unaccent(COALESCE(title, ''))), 'A') ||
        setweight(to_tsvector('hungarian', unaccent(COALESCE(transcript_text, ''))), 'B') ||
        setweight(to_tsvector('hungarian', unaccent(COALESCE(summary, ''))), 'C') ||
        setweight(to_tsvector('hungarian', unaccent(array_to_string(tags, ' '))), 'D');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create trigger to update search vector
CREATE OR REPLACE FUNCTION update_meeting_search_vector()
RETURNS trigger AS $$
BEGIN
    NEW.search_vector := meeting_search_vector(
        NEW.title,
        NEW.transcript->>'text',
        NEW.summary,
        NEW.tags
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS meetings_search_vector_update ON meetings;

-- Create trigger for search vector updates
CREATE TRIGGER meetings_search_vector_update
BEFORE INSERT OR UPDATE OF title, transcript, summary, tags
ON meetings
FOR EACH ROW
EXECUTE FUNCTION update_meeting_search_vector();

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_meetings_search_vector ON meetings USING GIN (search_vector);

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at);
CREATE INDEX IF NOT EXISTS idx_meetings_speakers ON meetings USING GIN ((metadata->'speakers'));
CREATE INDEX IF NOT EXISTS idx_meetings_tags ON meetings USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_team_id ON meetings(team_id);

-- Update existing meetings with search vectors
UPDATE meetings 
SET search_vector = meeting_search_vector(
    title,
    transcript->>'text',
    summary,
    tags
)
WHERE search_vector IS NULL;

-- Create search history table for analytics
CREATE TABLE IF NOT EXISTS search_queries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    clicked_results JSONB DEFAULT '[]',
    search_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL, -- 'transcription', 'search', 'upload', etc.
    metric_name VARCHAR(100) NOT NULL,
    value DECIMAL,
    unit VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create business metrics table
CREATE TABLE IF NOT EXISTS business_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'usage', 'engagement', 'retention', etc.
    metric_name VARCHAR(100) NOT NULL,
    value DECIMAL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(metric_date, metric_type, metric_name)
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id ON search_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_team_id ON analytics_events(team_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_business_metrics_date ON business_metrics(metric_date);
CREATE INDEX IF NOT EXISTS idx_business_metrics_type ON business_metrics(metric_type);

-- Enable RLS on analytics tables
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search queries
CREATE POLICY "Users can view their own search queries"
ON search_queries FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create search queries"
ON search_queries FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- RLS Policies for analytics events
CREATE POLICY "Users can create analytics events"
ON analytics_events FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all analytics events"
ON analytics_events FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- RLS Policies for metrics (admin only)
CREATE POLICY "Admins can view performance metrics"
ON performance_metrics FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

CREATE POLICY "System can insert performance metrics"
ON performance_metrics FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view business metrics"
ON business_metrics FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

CREATE POLICY "System can manage business metrics"
ON business_metrics FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Function to search meetings with relevance ranking
CREATE OR REPLACE FUNCTION search_meetings(
    search_query TEXT,
    filter_user_id UUID DEFAULT NULL,
    filter_team_id UUID DEFAULT NULL,
    filter_date_from TIMESTAMPTZ DEFAULT NULL,
    filter_date_to TIMESTAMPTZ DEFAULT NULL,
    filter_speakers TEXT[] DEFAULT NULL,
    filter_tags TEXT[] DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    created_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    summary TEXT,
    speakers JSONB,
    tags TEXT[],
    relevance REAL,
    headline TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.title,
        m.created_at,
        m.duration_seconds,
        m.summary,
        m.metadata->'speakers' as speakers,
        m.tags,
        ts_rank_cd(m.search_vector, websearch_to_tsquery('hungarian', unaccent(search_query))) as relevance,
        ts_headline(
            'hungarian',
            unaccent(COALESCE(m.transcript->>'text', m.summary, '')),
            websearch_to_tsquery('hungarian', unaccent(search_query)),
            'StartSel=<mark>, StopSel=</mark>, MaxWords=20, MinWords=10'
        ) as headline
    FROM meetings m
    WHERE 
        m.search_vector @@ websearch_to_tsquery('hungarian', unaccent(search_query))
        AND (filter_user_id IS NULL OR m.user_id = filter_user_id)
        AND (filter_team_id IS NULL OR m.team_id = filter_team_id)
        AND (filter_date_from IS NULL OR m.created_at >= filter_date_from)
        AND (filter_date_to IS NULL OR m.created_at <= filter_date_to)
        AND (filter_speakers IS NULL OR m.metadata->'speakers' ?| filter_speakers)
        AND (filter_tags IS NULL OR m.tags && filter_tags)
        AND m.status = 'completed'
    ORDER BY relevance DESC, m.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
    partial_query TEXT,
    user_id UUID,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    suggestion TEXT,
    usage_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sq.query as suggestion,
        COUNT(*) as usage_count
    FROM search_queries sq
    WHERE 
        sq.user_id = user_id
        AND sq.query ILIKE partial_query || '%'
        AND sq.results_count > 0
        AND sq.created_at > NOW() - INTERVAL '30 days'
    GROUP BY sq.query
    ORDER BY usage_count DESC, MAX(sq.created_at) DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql STABLE;