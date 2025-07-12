-- Create teams_integrations table
CREATE TABLE IF NOT EXISTS teams_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  access_token_iv TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  refresh_token_iv TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  tenant_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Create teams_meetings table
CREATE TABLE IF NOT EXISTS teams_meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES teams_integrations(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  teams_meeting_id TEXT NOT NULL,
  join_url TEXT,
  chat_id TEXT,
  recording_url TEXT,
  transcript_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id)
);

-- Create teams_webhook_logs table
CREATE TABLE IF NOT EXISTS teams_webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES teams_integrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  resource_id TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_teams_integrations_user_id ON teams_integrations(user_id);
CREATE INDEX idx_teams_integrations_organization_id ON teams_integrations(organization_id);
CREATE INDEX idx_teams_meetings_integration_id ON teams_meetings(integration_id);
CREATE INDEX idx_teams_meetings_meeting_id ON teams_meetings(meeting_id);
CREATE INDEX idx_teams_webhook_logs_integration_id ON teams_webhook_logs(integration_id);
CREATE INDEX idx_teams_webhook_logs_created_at ON teams_webhook_logs(created_at);

-- Add RLS policies
ALTER TABLE teams_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policies for teams_integrations
CREATE POLICY "Users can view their own Teams integrations"
  ON teams_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own Teams integrations"
  ON teams_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Teams integrations"
  ON teams_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own Teams integrations"
  ON teams_integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for teams_meetings
CREATE POLICY "Users can view Teams meetings in their organization"
  ON teams_meetings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM teams_integrations ti
      WHERE ti.id = teams_meetings.integration_id
      AND ti.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create Teams meetings"
  ON teams_meetings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams_integrations ti
      WHERE ti.id = integration_id
      AND ti.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their Teams meetings"
  ON teams_meetings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM teams_integrations ti
      WHERE ti.id = teams_meetings.integration_id
      AND ti.user_id = auth.uid()
    )
  );

-- Policies for teams_webhook_logs
CREATE POLICY "Users can view Teams webhook logs"
  ON teams_webhook_logs FOR SELECT
  USING (
    integration_id IS NULL OR
    EXISTS (
      SELECT 1 FROM teams_integrations ti
      WHERE ti.id = teams_webhook_logs.integration_id
      AND ti.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_teams_integrations_updated_at
  BEFORE UPDATE ON teams_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

CREATE TRIGGER update_teams_meetings_updated_at
  BEFORE UPDATE ON teams_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();