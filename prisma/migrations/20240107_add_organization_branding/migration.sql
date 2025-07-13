-- Add branding column to organizations table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'branding') THEN
        ALTER TABLE organizations ADD COLUMN branding JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add contact columns to organizations table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'contact_email') THEN
        ALTER TABLE organizations ADD COLUMN contact_email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'contact_phone') THEN
        ALTER TABLE organizations ADD COLUMN contact_phone TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'website') THEN
        ALTER TABLE organizations ADD COLUMN website TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'organizations' 
                   AND column_name = 'address') THEN
        ALTER TABLE organizations ADD COLUMN address TEXT;
    END IF;
END $$;

-- Create storage bucket for organization assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-assets',
  'organization-assets',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on organization-assets bucket
CREATE POLICY "Organizations can upload their own assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Organizations can update their own assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Organizations can delete their own assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-assets' AND
  (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view organization assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'organization-assets');