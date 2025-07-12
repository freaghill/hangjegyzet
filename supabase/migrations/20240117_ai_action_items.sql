-- Update meeting_action_items table to support AI-generated items
ALTER TABLE meeting_action_items 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('task', 'decision', 'follow-up', 'research', 'meeting')),
ADD COLUMN IF NOT EXISTS context TEXT,
ADD COLUMN IF NOT EXISTS confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS order_index INTEGER;

-- Create table for AI extraction history
CREATE TABLE IF NOT EXISTS ai_extraction_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic')),
  extraction_type TEXT NOT NULL CHECK (extraction_type IN ('action_items', 'summary', 'insights')),
  settings JSONB DEFAULT '{}',
  results JSONB NOT NULL,
  reasoning TEXT,
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  tokens_used INTEGER,
  cost_cents INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update meeting_ai_summaries to include more insights
ALTER TABLE meeting_ai_summaries
ADD COLUMN IF NOT EXISTS insights JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS next_steps TEXT[] DEFAULT '{}';

-- Create table for AI model performance tracking
CREATE TABLE IF NOT EXISTS ai_model_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  model_provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  accuracy_score FLOAT,
  user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
  feedback TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_extraction_meeting ON ai_extraction_history(meeting_id);
CREATE INDEX idx_ai_extraction_org ON ai_extraction_history(organization_id);
CREATE INDEX idx_ai_extraction_user ON ai_extraction_history(user_id);
CREATE INDEX idx_ai_extraction_type ON ai_extraction_history(extraction_type);
CREATE INDEX idx_ai_extraction_created ON ai_extraction_history(created_at);
CREATE INDEX idx_action_items_ai ON meeting_action_items(is_ai_generated);
CREATE INDEX idx_action_items_category ON meeting_action_items(category);
CREATE INDEX idx_ai_performance_org ON ai_model_performance(organization_id);

-- Enable RLS
ALTER TABLE ai_extraction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_model_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_extraction_history
CREATE POLICY "Organization members can view AI extractions"
  ON ai_extraction_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = ai_extraction_history.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create AI extractions"
  ON ai_extraction_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for ai_model_performance
CREATE POLICY "Organization admins can manage AI performance"
  ON ai_model_performance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = ai_model_performance.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

-- Function to calculate AI extraction stats
CREATE OR REPLACE FUNCTION get_ai_extraction_stats(org_id UUID)
RETURNS TABLE (
  total_extractions BIGINT,
  avg_quality_score FLOAT,
  total_action_items BIGINT,
  most_used_provider TEXT,
  avg_duration_ms FLOAT,
  total_cost_cents BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_extractions,
    AVG(quality_score)::FLOAT as avg_quality_score,
    (SELECT COUNT(*) FROM meeting_action_items 
     WHERE organization_id = org_id AND is_ai_generated = TRUE)::BIGINT as total_action_items,
    (SELECT provider FROM ai_extraction_history 
     WHERE organization_id = org_id 
     GROUP BY provider 
     ORDER BY COUNT(*) DESC 
     LIMIT 1) as most_used_provider,
    AVG(duration_ms)::FLOAT as avg_duration_ms,
    SUM(cost_cents)::BIGINT as total_cost_cents
  FROM ai_extraction_history
  WHERE organization_id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE ai_extraction_history IS 'Track all AI extractions for analytics and cost tracking';
COMMENT ON TABLE ai_model_performance IS 'Track AI model performance and user satisfaction';
COMMENT ON FUNCTION get_ai_extraction_stats IS 'Get AI extraction statistics for an organization';