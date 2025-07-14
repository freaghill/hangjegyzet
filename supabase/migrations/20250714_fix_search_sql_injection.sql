-- Fix SQL injection vulnerability in search_meetings function
-- This migration replaces the vulnerable search function with a secure version

DROP FUNCTION IF EXISTS search_meetings;

-- Create secure version using parameterized queries and proper escaping
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
DECLARE
    v_safe_query TEXT;
    v_tsquery tsquery;
BEGIN
    -- Sanitize the query to prevent SQL injection
    -- Remove any SQL special characters and limit length
    v_safe_query := left(regexp_replace(p_query, '[;''"\-\-/**/]', '', 'g'), 200);
    
    -- If query is empty after sanitization, return empty result
    IF v_safe_query = '' OR v_safe_query IS NULL THEN
        RETURN;
    END IF;
    
    -- Create a safe tsquery for full-text search
    BEGIN
        v_tsquery := plainto_tsquery('hungarian', v_safe_query);
    EXCEPTION WHEN OTHERS THEN
        -- If tsquery creation fails, use a simple contains search
        v_tsquery := to_tsquery('simple', quote_literal(v_safe_query));
    END;
    
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
            -- Calculate relevance score using safe methods
            (
                -- Title similarity (weight: 0.3)
                COALESCE(similarity(m.title, v_safe_query) * 0.3, 0) +
                -- Summary full-text search (weight: 0.2)
                CASE 
                    WHEN to_tsvector('hungarian', COALESCE(m.summary, '')) @@ v_tsquery
                    THEN 0.2 
                    ELSE 0 
                END +
                -- Transcript similarity (weight: 0.3)
                COALESCE(similarity(m.transcript->>'text', v_safe_query) * 0.3, 0) +
                -- Action items search using JSONB containment (weight: 0.1)
                CASE 
                    WHEN EXISTS (
                        SELECT 1 
                        FROM jsonb_array_elements(m.action_items) AS item
                        WHERE item->>'title' ILIKE '%' || v_safe_query || '%'
                           OR item->>'description' ILIKE '%' || v_safe_query || '%'
                    )
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
                -- Use full-text search instead of ILIKE for better performance and security
                to_tsvector('hungarian', COALESCE(m.title, '') || ' ' || 
                                       COALESCE(m.summary, '') || ' ' || 
                                       COALESCE(m.transcript->>'text', '')) @@ v_tsquery
                OR 
                -- Fallback to trigram similarity for fuzzy matching
                m.title % v_safe_query
                OR 
                m.summary % v_safe_query
                OR 
                (m.transcript->>'text') % v_safe_query
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

-- Also fix any other search functions that might have similar issues
-- Function to search users (if exists)
DROP FUNCTION IF EXISTS search_users;

CREATE OR REPLACE FUNCTION search_users(
    p_organization_id UUID,
    p_query TEXT,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    email VARCHAR(255),
    full_name VARCHAR(255),
    role user_role,
    avatar_url TEXT
) AS $$
DECLARE
    v_safe_query TEXT;
BEGIN
    -- Sanitize query
    v_safe_query := left(regexp_replace(p_query, '[;''"\-\-/**/]', '', 'g'), 100);
    
    IF v_safe_query = '' OR v_safe_query IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.avatar_url
    FROM users u
    INNER JOIN organization_members om ON om.user_id = u.id
    WHERE 
        om.organization_id = p_organization_id
        AND (
            u.email % v_safe_query
            OR u.full_name % v_safe_query
            OR to_tsvector('simple', COALESCE(u.full_name, '') || ' ' || COALESCE(u.email, '')) 
               @@ to_tsquery('simple', quote_literal(v_safe_query))
        )
    ORDER BY 
        similarity(COALESCE(u.full_name, '') || ' ' || u.email, v_safe_query) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_users TO authenticated;