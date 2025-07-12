-- Support tickets table for customer support
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  meeting_id UUID REFERENCES meetings(id),
  type TEXT NOT NULL CHECK (type IN (
    'transcription_failed', 
    'billing_issue', 
    'technical_support', 
    'feature_request'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 
    'in_progress', 
    'resolved', 
    'closed'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low', 
    'medium', 
    'high', 
    'urgent'
  )),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support comments table
CREATE TABLE IF NOT EXISTS support_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_organization_id ON support_tickets(organization_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_comments_ticket_id ON support_comments(ticket_id);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support tickets
-- Users can view their own tickets
CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create tickets
CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all tickets
CREATE POLICY "Admins can view all tickets"
  ON support_tickets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for comments
-- Users can view comments on their tickets
CREATE POLICY "Users can view comments on own tickets"
  ON support_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = support_comments.ticket_id
      AND support_tickets.user_id = auth.uid()
    )
    AND NOT is_internal
  );

-- Users can add comments to their tickets
CREATE POLICY "Users can comment on own tickets"
  ON support_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_id
      AND support_tickets.user_id = auth.uid()
    )
    AND NOT is_internal
  );

-- Admins can manage all comments
CREATE POLICY "Admins can manage all comments"
  ON support_comments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to auto-create support ticket on transcription failure
CREATE OR REPLACE FUNCTION create_support_ticket_on_failure()
RETURNS TRIGGER AS $$
BEGIN
  -- Create ticket when meeting status changes to 'failed'
  IF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    INSERT INTO support_tickets (
      user_id,
      organization_id,
      meeting_id,
      type,
      priority,
      subject,
      description
    )
    SELECT
      NEW.created_by,
      p.organization_id,
      NEW.id,
      'transcription_failed',
      'high',
      'Transcription Failed: ' || COALESCE(NEW.title, 'Untitled Meeting'),
      'The transcription for your meeting has failed. Our support team has been notified and will investigate the issue. Meeting ID: ' || NEW.id
    FROM profiles p
    WHERE p.id = NEW.created_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER auto_create_support_ticket
  AFTER UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION create_support_ticket_on_failure();

-- Updated at trigger
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE support_tickets IS 'Customer support ticket system';
COMMENT ON TABLE support_comments IS 'Comments and internal notes on support tickets';