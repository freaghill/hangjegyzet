-- AI Intelligence Features Database Schema
-- This migration adds tables and functions for advanced AI features

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Meeting predictions table
CREATE TABLE IF NOT EXISTS meeting_predictions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  predicted_topics JSONB DEFAULT '[]',
  estimated_duration INTEGER, -- in minutes
  estimated_cost DECIMAL(10,2),
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  actual_duration INTEGER, -- for accuracy tracking
  accuracy_score DECIMAL(3,2), -- calculated after meeting
  prediction_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Speaker profiles table
CREATE TABLE IF NOT EXISTS speaker_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  voice_fingerprint JSONB DEFAULT '{}',
  communication_style TEXT CHECK (communication_style IN ('direct', 'diplomatic', 'analytical', 'creative', 'supportive')),
  speaking_patterns JSONB DEFAULT '{}', -- filler words, pace, vocabulary
  total_speaking_time INTEGER DEFAULT 0, -- in seconds
  total_meetings INTEGER DEFAULT 0,
  average_engagement_score DECIMAL(3,2) DEFAULT 0.0,
  profile_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

-- Meeting patterns table
CREATE TABLE IF NOT EXISTS meeting_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('recurring_issue', 'behavioral', 'temporal', 'topical', 'participant')),
  pattern_data JSONB NOT NULL,
  frequency INTEGER DEFAULT 1,
  last_detected TIMESTAMPTZ DEFAULT NOW(),
  importance_score DECIMAL(3,2) DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting insights table
CREATE TABLE IF NOT EXISTS meeting_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('deal_probability', 'compliance_issue', 'market_insight', 'budget_impact', 'risk')),
  insight_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2) DEFAULT 0.0,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-meeting briefs table
CREATE TABLE IF NOT EXISTS pre_meeting_briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  brief_content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  viewed_by UUID REFERENCES auth.users(id)
);

-- Meeting health metrics table
CREATE TABLE IF NOT EXISTS meeting_health_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  total_meetings INTEGER DEFAULT 0,
  total_meeting_hours DECIMAL(10,2) DEFAULT 0,
  average_attendance DECIMAL(5,2) DEFAULT 0,
  average_engagement_score DECIMAL(3,2) DEFAULT 0,
  meeting_overload_score DECIMAL(3,2) DEFAULT 0,
  productivity_score DECIMAL(3,2) DEFAULT 0,
  health_score DECIMAL(3,2) DEFAULT 0,
  metrics_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, metric_date)
);

-- AI template learning table
CREATE TABLE IF NOT EXISTS ai_template_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES meeting_templates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  pattern_data JSONB NOT NULL,
  usage_count INTEGER DEFAULT 1,
  success_rate DECIMAL(3,2) DEFAULT 0.0,
  last_used TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting embeddings for similarity search
CREATE TABLE IF NOT EXISTS meeting_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI embedding dimension
  embedding_model TEXT DEFAULT 'text-embedding-ada-002',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_meeting_predictions_org ON meeting_predictions(organization_id);
CREATE INDEX idx_meeting_predictions_meeting ON meeting_predictions(meeting_id);
CREATE INDEX idx_speaker_profiles_org ON speaker_profiles(organization_id);
CREATE INDEX idx_speaker_profiles_email ON speaker_profiles(email);
CREATE INDEX idx_meeting_patterns_org ON meeting_patterns(organization_id);
CREATE INDEX idx_meeting_patterns_type ON meeting_patterns(pattern_type);
CREATE INDEX idx_meeting_insights_meeting ON meeting_insights(meeting_id);
CREATE INDEX idx_meeting_insights_type ON meeting_insights(insight_type);
CREATE INDEX idx_pre_meeting_briefs_meeting ON pre_meeting_briefs(meeting_id);
CREATE INDEX idx_meeting_health_metrics_org_date ON meeting_health_metrics(organization_id, metric_date);
CREATE INDEX idx_ai_template_patterns_template ON ai_template_patterns(template_id);
CREATE INDEX idx_meeting_embeddings_org ON meeting_embeddings(organization_id);

-- Vector similarity search index
CREATE INDEX idx_meeting_embeddings_vector ON meeting_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Add new columns to existing tables
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT FALSE;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS effectiveness_score DECIMAL(3,2);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS engagement_score DECIMAL(3,2);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS predicted_duration INTEGER;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS actual_duration INTEGER;

-- Function to update speaker profile after meeting
CREATE OR REPLACE FUNCTION update_speaker_profile_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update speaker profiles based on meeting data
  IF NEW.speakers IS NOT NULL THEN
    FOR speaker IN SELECT * FROM jsonb_array_elements(NEW.speakers)
    LOOP
      INSERT INTO speaker_profiles (
        organization_id,
        name,
        email,
        total_speaking_time,
        total_meetings
      ) VALUES (
        NEW.organization_id,
        speaker->>'name',
        speaker->>'email',
        COALESCE((speaker->>'speaking_time')::INTEGER, 0),
        1
      )
      ON CONFLICT (organization_id, email) 
      DO UPDATE SET
        total_speaking_time = speaker_profiles.total_speaking_time + EXCLUDED.total_speaking_time,
        total_meetings = speaker_profiles.total_meetings + 1,
        updated_at = NOW();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update speaker profiles
CREATE TRIGGER update_speaker_profiles_on_meeting_complete
  AFTER UPDATE OF status ON meetings
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION update_speaker_profile_stats();

-- Function to calculate meeting health score
CREATE OR REPLACE FUNCTION calculate_meeting_health_score(
  p_organization_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS DECIMAL AS $$
DECLARE
  v_health_score DECIMAL;
  v_metrics RECORD;
BEGIN
  -- Get metrics for the date
  SELECT 
    COUNT(*) as total_meetings,
    COALESCE(AVG(effectiveness_score), 0) as avg_effectiveness,
    COALESCE(AVG(engagement_score), 0) as avg_engagement,
    COALESCE(SUM(duration_seconds) / 3600.0, 0) as total_hours
  INTO v_metrics
  FROM meetings
  WHERE organization_id = p_organization_id
    AND DATE(created_at) = p_date
    AND status = 'completed';
  
  -- Calculate health score (simplified formula)
  v_health_score := LEAST(100, GREATEST(0,
    (v_metrics.avg_effectiveness * 0.4) +
    (v_metrics.avg_engagement * 0.3) +
    (CASE 
      WHEN v_metrics.total_meetings = 0 THEN 50
      WHEN v_metrics.total_meetings <= 5 THEN 80
      WHEN v_metrics.total_meetings <= 10 THEN 60
      ELSE 40
    END * 0.3)
  ));
  
  -- Update or insert health metrics
  INSERT INTO meeting_health_metrics (
    organization_id,
    metric_date,
    total_meetings,
    total_meeting_hours,
    average_engagement_score,
    health_score
  ) VALUES (
    p_organization_id,
    p_date,
    v_metrics.total_meetings,
    v_metrics.total_hours,
    v_metrics.avg_engagement,
    v_health_score
  )
  ON CONFLICT (organization_id, metric_date)
  DO UPDATE SET
    total_meetings = EXCLUDED.total_meetings,
    total_meeting_hours = EXCLUDED.total_meeting_hours,
    average_engagement_score = EXCLUDED.average_engagement_score,
    health_score = EXCLUDED.health_score;
  
  RETURN v_health_score;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON meeting_predictions TO authenticated;
GRANT SELECT ON speaker_profiles TO authenticated;
GRANT SELECT ON meeting_patterns TO authenticated;
GRANT SELECT ON meeting_insights TO authenticated;
GRANT SELECT ON pre_meeting_briefs TO authenticated;
GRANT SELECT ON meeting_health_metrics TO authenticated;
GRANT SELECT ON ai_template_patterns TO authenticated;
GRANT SELECT ON meeting_embeddings TO authenticated;

GRANT INSERT, UPDATE ON meeting_predictions TO authenticated;
GRANT INSERT, UPDATE ON speaker_profiles TO authenticated;
GRANT INSERT, UPDATE ON meeting_patterns TO authenticated;
GRANT INSERT ON meeting_insights TO authenticated;
GRANT INSERT ON pre_meeting_briefs TO authenticated;
GRANT INSERT, UPDATE ON meeting_health_metrics TO authenticated;
GRANT INSERT, UPDATE ON ai_template_patterns TO authenticated;
GRANT INSERT ON meeting_embeddings TO authenticated;

-- Row Level Security
ALTER TABLE meeting_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE speaker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE pre_meeting_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_template_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view predictions for their organization"
  ON meeting_predictions FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view speaker profiles for their organization"
  ON speaker_profiles FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view patterns for their organization"
  ON meeting_patterns FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view insights for their organization"
  ON meeting_insights FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view briefs for their organization"
  ON pre_meeting_briefs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view health metrics for their organization"
  ON meeting_health_metrics FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view AI patterns for their organization"
  ON ai_template_patterns FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view embeddings for their organization"
  ON meeting_embeddings FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
  ));