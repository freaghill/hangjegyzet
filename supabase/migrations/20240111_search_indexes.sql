-- Add GIN indexes for full-text search on meetings table
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on title for trigram similarity search
CREATE INDEX IF NOT EXISTS idx_meetings_title_gin ON meetings USING gin (title gin_trgm_ops);

-- Create GIN index on summary for full-text search
CREATE INDEX IF NOT EXISTS idx_meetings_summary_gin ON meetings USING gin (to_tsvector('hungarian', COALESCE(summary, '')));

-- Create GIN index on transcript text (JSONB) for full-text search
CREATE INDEX IF NOT EXISTS idx_meetings_transcript_gin ON meetings USING gin ((transcript->>'text') gin_trgm_ops);

-- Create composite index for speaker search in transcript
CREATE INDEX IF NOT EXISTS idx_meetings_speakers_gin ON meetings USING gin (speakers);

-- Create index on action_items JSONB for searching tasks
CREATE INDEX IF NOT EXISTS idx_meetings_action_items_gin ON meetings USING gin (action_items);

-- Function to search meetings with full-text and similarity
CREATE OR REPLACE FUNCTION search_meetings(
    p_organization_id UUID,
    p_query TEXT,
    p_date_from TIMESTAMPTZ DEFAULT NULL,
    p_date_to TIMESTAMPTZ DEFAULT NULL,
    p_speaker TEXT DEFAULT NULL,
    p_min_duration INTEGER DEFAULT NULL,
    p_max_duration INTEGER DEFAULT NULL,
    p_status meeting_status DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    created_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    status meeting_status,
    summary TEXT,
    speakers JSONB,
    action_items JSONB,
    transcript JSONB,
    intelligence_score FLOAT,
    relevance FLOAT
) AS $$
BEGIN
    RETURN QUERY
    WITH ranked_results AS (
        SELECT 
            m.id,
            m.title,
            m.created_at,
            m.duration_seconds,
            m.status,
            m.summary,
            m.speakers,
            m.action_items,
            m.transcript,
            m.intelligence_score,
            -- Calculate relevance score
            (
                -- Title similarity (weight: 0.3)
                COALESCE(similarity(m.title, p_query) * 0.3, 0) +
                -- Summary full-text search (weight: 0.2)
                CASE 
                    WHEN to_tsvector('hungarian', COALESCE(m.summary, '')) @@ plainto_tsquery('hungarian', p_query) 
                    THEN 0.2 
                    ELSE 0 
                END +
                -- Transcript similarity (weight: 0.3)
                COALESCE(similarity(m.transcript->>'text', p_query) * 0.3, 0) +
                -- Action items search (weight: 0.1)
                CASE 
                    WHEN m.action_items::text ILIKE '%' || p_query || '%' 
                    THEN 0.1 
                    ELSE 0 
                END +
                -- Intelligence score bonus (weight: 0.1)
                COALESCE(m.intelligence_score / 1000.0, 0)
            ) AS relevance
        FROM meetings m
        WHERE 
            m.organization_id = p_organization_id
            AND (p_status IS NULL OR m.status = p_status)
            AND (p_date_from IS NULL OR m.created_at >= p_date_from)
            AND (p_date_to IS NULL OR m.created_at <= p_date_to)
            AND (p_min_duration IS NULL OR m.duration_seconds >= p_min_duration)
            AND (p_max_duration IS NULL OR m.duration_seconds <= p_max_duration)
            AND (p_speaker IS NULL OR m.speakers @> jsonb_build_array(jsonb_build_object('name', p_speaker)))
            AND (
                -- Search in multiple fields
                m.title ILIKE '%' || p_query || '%'
                OR m.summary ILIKE '%' || p_query || '%'
                OR (m.transcript->>'text') ILIKE '%' || p_query || '%'
                OR m.action_items::text ILIKE '%' || p_query || '%'
            )
    )
    SELECT 
        ranked_results.id,
        ranked_results.title,
        ranked_results.created_at,
        ranked_results.duration_seconds,
        ranked_results.status,
        ranked_results.summary,
        ranked_results.speakers,
        ranked_results.action_items,
        ranked_results.transcript,
        ranked_results.intelligence_score,
        ranked_results.relevance
    FROM ranked_results
    WHERE ranked_results.relevance > 0
    ORDER BY ranked_results.relevance DESC, ranked_results.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_meetings TO authenticated;