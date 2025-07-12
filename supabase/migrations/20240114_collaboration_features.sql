-- Meeting comments table
CREATE TABLE IF NOT EXISTS meeting_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  parent_id UUID REFERENCES meeting_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Action items table
CREATE TABLE IF NOT EXISTS action_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  assignee_id UUID REFERENCES auth.users(id),
  due_date DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meeting shares table (for external sharing)
CREATE TABLE IF NOT EXISTS meeting_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id),
  share_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  permissions TEXT[] DEFAULT '{"view"}',
  expires_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_meeting_comments_meeting ON meeting_comments(meeting_id);
CREATE INDEX idx_meeting_comments_user ON meeting_comments(user_id);
CREATE INDEX idx_meeting_comments_pinned ON meeting_comments(is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_action_items_meeting ON action_items(meeting_id);
CREATE INDEX idx_action_items_assignee ON action_items(assignee_id);
CREATE INDEX idx_action_items_status ON action_items(status);
CREATE INDEX idx_action_items_due_date ON action_items(due_date);
CREATE INDEX idx_meeting_shares_token ON meeting_shares(share_token);

-- Enable RLS
ALTER TABLE meeting_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
-- Users in the organization can view comments
CREATE POLICY "Organization members can view comments"
  ON meeting_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN organization_members om ON om.organization_id = m.organization_id
      WHERE m.id = meeting_comments.meeting_id
      AND om.user_id = auth.uid()
    )
  );

-- Users can create comments on their org's meetings
CREATE POLICY "Organization members can create comments"
  ON meeting_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN organization_members om ON om.organization_id = m.organization_id
      WHERE m.id = meeting_id
      AND om.user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON meeting_comments FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON meeting_comments FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for action items
-- Organization members can view action items
CREATE POLICY "Organization members can view action items"
  ON action_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN organization_members om ON om.organization_id = m.organization_id
      WHERE m.id = action_items.meeting_id
      AND om.user_id = auth.uid()
    )
  );

-- Organization members can manage action items
CREATE POLICY "Organization members can manage action items"
  ON action_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN organization_members om ON om.organization_id = m.organization_id
      WHERE m.id = meeting_id
      AND om.user_id = auth.uid()
    )
  );

-- RLS Policies for meeting shares
-- Only meeting creators and org admins can create shares
CREATE POLICY "Meeting owners can create shares"
  ON meeting_shares FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN organization_members om ON om.organization_id = m.organization_id
      WHERE m.id = meeting_id
      AND om.user_id = auth.uid()
      AND (m.created_by = auth.uid() OR om.role = 'admin')
    )
    AND shared_by = auth.uid()
  );

-- Share creators can manage their shares
CREATE POLICY "Users can manage own shares"
  ON meeting_shares FOR ALL
  USING (shared_by = auth.uid());

-- Function to notify mentioned users
CREATE OR REPLACE FUNCTION notify_mentioned_users()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notifications to mentioned users
  IF array_length(NEW.mentions, 1) > 0 THEN
    INSERT INTO notifications (user_id, type, title, content, metadata)
    SELECT 
      unnest(NEW.mentions),
      'mention',
      'Említették egy megbeszélésben',
      'Valaki megemlítette Önt egy megjegyzésben',
      jsonb_build_object(
        'meeting_id', NEW.meeting_id,
        'comment_id', NEW.id,
        'mentioned_by', NEW.user_id
      )
    FROM unnest(NEW.mentions);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for mentions
CREATE TRIGGER notify_on_mention
  AFTER INSERT ON meeting_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_mentioned_users();

-- Function to notify assignee
CREATE OR REPLACE FUNCTION notify_action_item_assignee()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify on new assignment
  IF NEW.assignee_id IS NOT NULL AND (OLD.assignee_id IS NULL OR OLD.assignee_id != NEW.assignee_id) THEN
    INSERT INTO notifications (user_id, type, title, content, metadata)
    VALUES (
      NEW.assignee_id,
      'assignment',
      'Új feladat hozzárendelve',
      NEW.text,
      jsonb_build_object(
        'meeting_id', NEW.meeting_id,
        'action_item_id', NEW.id,
        'assigned_by', NEW.created_by,
        'due_date', NEW.due_date,
        'priority', NEW.priority
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for assignments
CREATE TRIGGER notify_on_assignment
  AFTER INSERT OR UPDATE ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_action_item_assignee();

-- Updated at triggers
CREATE TRIGGER update_meeting_comments_updated_at
  BEFORE UPDATE ON meeting_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_action_items_updated_at
  BEFORE UPDATE ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE meeting_comments IS 'Comments and discussions on meetings';
COMMENT ON TABLE action_items IS 'Action items and tasks from meetings';
COMMENT ON TABLE meeting_shares IS 'External sharing links for meetings';