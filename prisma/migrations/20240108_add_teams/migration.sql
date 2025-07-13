-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create team_members table with roles
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(team_id, user_id)
);

-- Create team_invitations table
CREATE TABLE IF NOT EXISTS team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role team_role NOT NULL DEFAULT 'member',
  token VARCHAR(255) UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  metadata JSONB DEFAULT '{}'
);

-- Create meeting_shares table for sharing meetings with teams
CREATE TABLE IF NOT EXISTS meeting_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  permission VARCHAR(50) NOT NULL DEFAULT 'view', -- view, comment, edit
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  CONSTRAINT share_target CHECK (
    (team_id IS NOT NULL AND user_id IS NULL) OR 
    (team_id IS NULL AND user_id IS NOT NULL)
  ),
  UNIQUE(meeting_id, team_id),
  UNIQUE(meeting_id, user_id)
);

-- Add team_id to meetings table
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Add team_id to organizations table for team-organization association
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_meeting_shares_meeting_id ON meeting_shares(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_shares_team_id ON meeting_shares(team_id);
CREATE INDEX IF NOT EXISTS idx_meetings_team_id ON meetings(team_id);

-- Enable RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view teams they are members of"
  ON teams FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and admins can update teams"
  ON teams FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Team owners can delete teams"
  ON teams FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role = 'owner'
    )
  );

-- RLS Policies for team_members
CREATE POLICY "Team members can view other members"
  ON team_members FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners and admins can add members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can update member roles"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can remove members"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
    OR user_id = auth.uid() -- Members can remove themselves
  );

-- RLS Policies for team_invitations
CREATE POLICY "Team members can view invitations"
  ON team_invitations FOR SELECT
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid()
    )
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

CREATE POLICY "Team owners and admins can create invitations"
  ON team_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners and admins can delete invitations"
  ON team_invitations FOR DELETE
  TO authenticated
  USING (
    team_id IN (
      SELECT team_id FROM team_members 
      WHERE user_id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for meeting_shares
CREATE POLICY "Users can view shares for their meetings or shared with them"
  ON meeting_shares FOR SELECT
  TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Meeting owners can share their meetings"
  ON meeting_shares FOR INSERT
  TO authenticated
  WITH CHECK (
    meeting_id IN (
      SELECT id FROM meetings WHERE user_id = auth.uid()
    )
    OR meeting_id IN (
      SELECT id FROM meetings m
      JOIN team_members tm ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Meeting owners can update shares"
  ON meeting_shares FOR UPDATE
  TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE user_id = auth.uid()
    )
    OR shared_by = auth.uid()
  );

CREATE POLICY "Meeting owners can delete shares"
  ON meeting_shares FOR DELETE
  TO authenticated
  USING (
    meeting_id IN (
      SELECT id FROM meetings WHERE user_id = auth.uid()
    )
    OR shared_by = auth.uid()
  );

-- Update meetings RLS to include team access
DROP POLICY IF EXISTS "Users can view their own meetings" ON meetings;
CREATE POLICY "Users can view their own meetings or team meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
    OR id IN (
      SELECT meeting_id FROM meeting_shares 
      WHERE user_id = auth.uid() 
      OR team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      )
    )
  );

-- Function to handle team creation with owner
CREATE OR REPLACE FUNCTION create_team_with_owner(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
) RETURNS teams AS $$
DECLARE
  v_team teams;
BEGIN
  -- Insert team
  INSERT INTO teams (name, slug, description, avatar_url, created_by)
  VALUES (p_name, p_slug, p_description, p_avatar_url, auth.uid())
  RETURNING * INTO v_team;
  
  -- Add creator as owner
  INSERT INTO team_members (team_id, user_id, role, invited_by)
  VALUES (v_team.id, auth.uid(), 'owner', auth.uid());
  
  RETURN v_team;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION accept_team_invitation(p_token TEXT)
RETURNS team_members AS $$
DECLARE
  v_invitation team_invitations;
  v_member team_members;
BEGIN
  -- Find valid invitation
  SELECT * INTO v_invitation
  FROM team_invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > NOW()
    AND email = (SELECT email FROM auth.users WHERE id = auth.uid());
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;
  
  -- Create team member
  INSERT INTO team_members (team_id, user_id, role, invited_by)
  VALUES (v_invitation.team_id, auth.uid(), v_invitation.role, v_invitation.invited_by)
  RETURNING * INTO v_member;
  
  -- Mark invitation as accepted
  UPDATE team_invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;
  
  RETURN v_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;