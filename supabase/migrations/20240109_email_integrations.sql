-- Create email integrations table
CREATE TABLE IF NOT EXISTS email_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  allowed_senders TEXT[], -- Array of allowed email addresses
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, domain)
);

-- Create indexes
CREATE INDEX idx_email_integrations_org ON email_integrations(organization_id);
CREATE INDEX idx_email_integrations_domain ON email_integrations(domain);

-- RLS policies
ALTER TABLE email_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization admins can manage email integrations" ON email_integrations
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id 
      FROM organization_members 
      WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON email_integrations TO authenticated;