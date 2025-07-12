-- Create table for tracking meeting exports
CREATE TABLE IF NOT EXISTS meeting_exports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  format TEXT NOT NULL CHECK (format IN ('pdf', 'docx', 'html', 'txt', 'json')),
  template_id TEXT,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  file_size BIGINT,
  metadata JSONB DEFAULT '{}'
);

-- Create table for custom export templates
CREATE TABLE IF NOT EXISTS export_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  styles TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  format TEXT NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'docx', 'html')),
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_meeting_exports_meeting ON meeting_exports(meeting_id);
CREATE INDEX idx_meeting_exports_org ON meeting_exports(organization_id);
CREATE INDEX idx_meeting_exports_user ON meeting_exports(user_id);
CREATE INDEX idx_meeting_exports_date ON meeting_exports(exported_at);
CREATE INDEX idx_export_templates_org ON export_templates(organization_id);
CREATE INDEX idx_export_templates_active ON export_templates(is_active);

-- Enable RLS
ALTER TABLE meeting_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meeting_exports
CREATE POLICY "Organization members can view export history"
  ON meeting_exports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = meeting_exports.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create export records"
  ON meeting_exports FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for export_templates
CREATE POLICY "Organization members can view templates"
  ON export_templates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = export_templates.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Organization admins can manage templates"
  ON export_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = export_templates.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'owner')
    )
  );

-- Function to ensure only one default template per category per organization
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE export_templates
    SET is_default = FALSE
    WHERE organization_id = NEW.organization_id
      AND category = NEW.category
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for default template management
CREATE TRIGGER manage_default_template
  BEFORE INSERT OR UPDATE ON export_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_template();

-- Trigger to update timestamps
CREATE TRIGGER update_export_templates_updated_at
  BEFORE UPDATE ON export_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE meeting_exports IS 'Track all meeting exports for analytics and auditing';
COMMENT ON TABLE export_templates IS 'Custom export templates for organizations';