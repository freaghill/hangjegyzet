-- Create vocabulary categories enum
CREATE TYPE vocabulary_category AS ENUM (
    'general',
    'finance',
    'it',
    'legal',
    'medical',
    'marketing',
    'hr',
    'manufacturing',
    'real_estate',
    'education',
    'government',
    'custom'
);

-- Create vocabulary terms table
CREATE TABLE vocabulary_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    term VARCHAR(255) NOT NULL,
    variations TEXT[], -- Array of variations/alternative spellings
    category vocabulary_category DEFAULT 'general',
    custom_category VARCHAR(100), -- For when category is 'custom'
    phonetic_hint VARCHAR(255), -- Phonetic representation for better matching
    context_hints TEXT[], -- Context words that might appear near this term
    usage_count INTEGER DEFAULT 0,
    confidence_score FLOAT DEFAULT 1.0, -- How confident we are in this term
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_vocab_org (organization_id),
    INDEX idx_vocab_term (term),
    INDEX idx_vocab_category (category),
    INDEX idx_vocab_active (is_active),
    
    -- Unique constraint to prevent duplicates within organization
    UNIQUE(organization_id, term)
);

-- Create vocabulary learning history table
CREATE TABLE vocabulary_learning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    term_extracted VARCHAR(255),
    context TEXT, -- Surrounding text for context
    confidence_before FLOAT,
    confidence_after FLOAT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_learning_org (organization_id),
    INDEX idx_learning_meeting (meeting_id)
);

-- Create vocabulary imports table for tracking imports
CREATE TABLE vocabulary_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    terms_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    imported_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Indexes
    INDEX idx_imports_org (organization_id),
    INDEX idx_imports_status (status)
);

-- Create shared vocabularies table
CREATE TABLE shared_vocabularies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category vocabulary_category DEFAULT 'general',
    terms_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    share_token VARCHAR(100) UNIQUE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes
    INDEX idx_shared_org (organization_id),
    INDEX idx_shared_public (is_public),
    INDEX idx_shared_token (share_token)
);

-- Create many-to-many relationship for shared vocabulary terms
CREATE TABLE shared_vocabulary_terms (
    shared_vocabulary_id UUID NOT NULL REFERENCES shared_vocabularies(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES vocabulary_terms(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (shared_vocabulary_id, term_id)
);

-- Enable RLS
ALTER TABLE vocabulary_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_learning ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_vocabulary_terms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vocabulary_terms
CREATE POLICY "Users can view their organization's vocabulary" ON vocabulary_terms
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create vocabulary terms" ON vocabulary_terms
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their organization's vocabulary" ON vocabulary_terms
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete vocabulary terms" ON vocabulary_terms
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- RLS Policies for vocabulary_learning
CREATE POLICY "Users can view their organization's learning history" ON vocabulary_learning
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create learning entries" ON vocabulary_learning
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for vocabulary_imports
CREATE POLICY "Users can view their organization's imports" ON vocabulary_imports
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create imports" ON vocabulary_imports
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- RLS Policies for shared_vocabularies
CREATE POLICY "Users can view their organization's shared vocabularies" ON shared_vocabularies
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        ) OR is_public = true
    );

CREATE POLICY "Users can create shared vocabularies" ON shared_vocabularies
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their shared vocabularies" ON shared_vocabularies
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete shared vocabularies" ON shared_vocabularies
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- RLS Policies for shared_vocabulary_terms
CREATE POLICY "Users can view shared vocabulary terms" ON shared_vocabulary_terms
    FOR SELECT USING (
        shared_vocabulary_id IN (
            SELECT id FROM shared_vocabularies
            WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            ) OR is_public = true
        )
    );

CREATE POLICY "Users can add terms to their shared vocabularies" ON shared_vocabulary_terms
    FOR INSERT WITH CHECK (
        shared_vocabulary_id IN (
            SELECT id FROM shared_vocabularies
            WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can remove terms from their shared vocabularies" ON shared_vocabulary_terms
    FOR DELETE USING (
        shared_vocabulary_id IN (
            SELECT id FROM shared_vocabularies
            WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Function to update usage count and confidence
CREATE OR REPLACE FUNCTION update_vocabulary_confidence(
    term_id UUID,
    was_correct BOOLEAN
)
RETURNS void AS $$
BEGIN
    UPDATE vocabulary_terms
    SET 
        usage_count = usage_count + 1,
        confidence_score = CASE
            WHEN was_correct THEN 
                LEAST(confidence_score + 0.1, 1.0)
            ELSE 
                GREATEST(confidence_score - 0.05, 0.1)
        END,
        updated_at = NOW()
    WHERE id = term_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to learn from corrections
CREATE OR REPLACE FUNCTION learn_from_correction(
    org_id UUID,
    meeting_id UUID,
    original TEXT,
    corrected TEXT,
    user_id UUID
)
RETURNS void AS $$
DECLARE
    extracted_terms TEXT[];
    term TEXT;
BEGIN
    -- Extract words that were corrected
    -- This is a simple implementation - could be enhanced with more sophisticated NLP
    extracted_terms := string_to_array(
        regexp_replace(corrected, '[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ\s-]', ' ', 'g'),
        ' '
    );
    
    -- Record the learning entry
    INSERT INTO vocabulary_learning (
        organization_id,
        meeting_id,
        original_text,
        corrected_text,
        created_by
    ) VALUES (
        org_id,
        meeting_id,
        original,
        corrected,
        user_id
    );
    
    -- Add new terms from corrections if they don't exist
    FOREACH term IN ARRAY extracted_terms
    LOOP
        IF length(term) > 2 THEN
            INSERT INTO vocabulary_terms (
                organization_id,
                term,
                category,
                created_by,
                confidence_score
            )
            VALUES (
                org_id,
                lower(term),
                'general',
                user_id,
                0.5
            )
            ON CONFLICT (organization_id, term) 
            DO UPDATE SET
                usage_count = vocabulary_terms.usage_count + 1,
                confidence_score = LEAST(vocabulary_terms.confidence_score + 0.05, 1.0),
                updated_at = NOW();
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at
CREATE TRIGGER update_vocabulary_terms_updated_at BEFORE UPDATE ON vocabulary_terms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shared_vocabularies_updated_at BEFORE UPDATE ON shared_vocabularies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();