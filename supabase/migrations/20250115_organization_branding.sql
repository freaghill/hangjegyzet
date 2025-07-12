-- Add branding_settings column to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS branding_settings JSONB DEFAULT '{}';

-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for branding bucket
CREATE POLICY "Organization members can upload branding assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding' AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = (storage.foldername(name))[1]::uuid
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Organization members can update branding assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding' AND
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = (storage.foldername(name))[1]::uuid
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

CREATE POLICY "Public can view branding assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'branding');

-- Add default branding settings to existing organizations
UPDATE organizations
SET branding_settings = '{
  "colors": {
    "primary": "#2563eb",
    "secondary": "#64748b",
    "accent": "#f59e0b",
    "text": "#1f2937",
    "background": "#ffffff"
  },
  "fonts": {
    "heading": "Inter, system-ui, -apple-system, sans-serif",
    "body": "Inter, system-ui, -apple-system, sans-serif",
    "size": {
      "base": 14,
      "h1": 28,
      "h2": 24,
      "h3": 20
    }
  },
  "header": {
    "show": true,
    "includePageNumbers": true,
    "includeLogo": true
  },
  "footer": {
    "show": true,
    "includeDate": true,
    "includeConfidentiality": false
  },
  "document": {
    "language": "hu"
  }
}'::jsonb
WHERE branding_settings = '{}' OR branding_settings IS NULL;

-- Create index for branding settings
CREATE INDEX IF NOT EXISTS idx_organizations_branding_settings 
ON organizations USING gin (branding_settings);

-- Add comment
COMMENT ON COLUMN organizations.branding_settings IS 'Organization-specific branding configuration for exports and emails';