-- Export templates table
CREATE TABLE IF NOT EXISTS export_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'html' CHECK (type IN ('html', 'text', 'markdown')),
  category TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_export_templates_organization ON export_templates(organization_id);
CREATE INDEX idx_export_templates_category ON export_templates(category);
CREATE INDEX idx_export_templates_default ON export_templates(is_default) WHERE is_default = true;
CREATE INDEX idx_export_templates_public ON export_templates(is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE export_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Organizations can manage their own templates
CREATE POLICY "Organizations can manage own templates"
  ON export_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles
      WHERE id = auth.uid()
    )
    OR is_public = true
  );

-- Anyone can view public templates
CREATE POLICY "Anyone can view public templates"
  ON export_templates FOR SELECT
  USING (is_public = true);

-- Insert default templates
INSERT INTO export_templates (name, description, template, type, category, is_default, is_public) VALUES
(
  'Jogi jegyzőkönyv',
  'Ügyvédi irodák és jogi szakemberek számára optimalizált sablon',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: ''Times New Roman'', serif; line-height: 1.6; margin: 40px; }
    .header { text-align: center; margin-bottom: 40px; }
    .section { margin-bottom: 30px; }
    .section-title { font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>MEGBESZÉLÉS JEGYZŐKÖNYV</h1>
    <p>Készült: {{hungarianDate meeting.date}}</p>
  </div>
  <div class="section">
    <div class="section-title">TÁRGY</div>
    <p>{{meeting.title}}</p>
  </div>
  {{#if meeting.transcript}}
  <div class="section">
    <div class="section-title">JEGYZŐKÖNYV</div>
    {{#each meeting.transcript}}
    <p>[{{timestamp this.timestamp}}] <strong>{{this.speaker}}:</strong> {{this.text}}</p>
    {{/each}}
  </div>
  {{/if}}
</body>
</html>',
  'html',
  'legal',
  true,
  true
),
(
  'Üzleti összefoglaló',
  'Vezetői megbeszélések és projekt meetingek számára',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; color: #333; margin: 30px; }
    .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    h1 { color: #2c3e50; margin: 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>{{meeting.title}}</h1>
    <p>{{hungarianDate meeting.date}} | {{duration meeting.duration}}</p>
  </div>
  {{#if meeting.summary}}
  <h2>Összefoglaló</h2>
  <p>{{meeting.summary}}</p>
  {{/if}}
  {{#if meeting.actionItems}}
  <h2>Feladatok</h2>
  {{#each meeting.actionItems}}
  <p>• {{this.text}} {{#if this.assignee}}({{this.assignee}}){{/if}}</p>
  {{/each}}
  {{/if}}
</body>
</html>',
  'html',
  'business',
  true,
  true
),
(
  'Egyszerű szöveges',
  'Tiszta szöveges formátum e-mailekhez és egyszerű megosztáshoz',
  'MEGBESZÉLÉS: {{meeting.title}}
DÁTUM: {{hungarianDate meeting.date}}
IDŐTARTAM: {{duration meeting.duration}}

{{#if meeting.summary}}
ÖSSZEFOGLALÓ:
{{meeting.summary}}
{{/if}}

{{#if meeting.actionItems}}
FELADATOK:
{{#each meeting.actionItems}}
- {{this.text}}{{#if this.assignee}} (Felelős: {{this.assignee}}){{/if}}
{{/each}}
{{/if}}

{{#if meeting.transcript}}
ÁTIRAT:
{{#each meeting.transcript}}
[{{timestamp this.timestamp}}] {{this.speaker}}: {{this.text}}
{{/each}}
{{/if}}',
  'text',
  'general',
  true,
  true
);

-- Storage bucket for exports
INSERT INTO storage.buckets (id, name, public, avif_autodetection, allowed_mime_types)
VALUES ('exports', 'exports', true, false, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/html', 'text/plain', 'text/csv'])
ON CONFLICT (id) DO NOTHING;

-- RLS for exports bucket
CREATE POLICY "Organizations can upload exports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'exports' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view exports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exports');

-- Updated at trigger
CREATE TRIGGER update_export_templates_updated_at
  BEFORE UPDATE ON export_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comment
COMMENT ON TABLE export_templates IS 'Customizable export templates for different industries and use cases';