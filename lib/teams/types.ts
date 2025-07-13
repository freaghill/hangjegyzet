export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'
export type SharePermission = 'view' | 'comment' | 'edit'

export interface Team {
  id: string
  name: string
  slug: string
  description?: string
  avatar_url?: string
  settings?: TeamSettings
  created_at: string
  updated_at: string
  created_by: string
  member_count?: number
  current_user_role?: TeamRole
}

export interface TeamSettings {
  defaultMeetingPermission?: SharePermission
  allowGuestAccess?: boolean
  requireApproval?: boolean
  notificationPreferences?: {
    newMeeting?: boolean
    newMember?: boolean
    meetingShared?: boolean
  }
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  joined_at: string
  invited_by?: string
  user?: {
    id: string
    email: string
    full_name?: string
    avatar_url?: string
  }
}

export interface TeamInvitation {
  id: string
  team_id: string
  email: string
  role: TeamRole
  token: string
  invited_by: string
  invited_at: string
  accepted_at?: string
  expires_at: string
  metadata?: {
    message?: string
    inviter_name?: string
  }
}

export interface MeetingShare {
  id: string
  meeting_id: string
  team_id?: string
  user_id?: string
  permission: SharePermission
  shared_by: string
  shared_at: string
  expires_at?: string
  meeting?: {
    id: string
    title: string
    created_at: string
  }
  team?: Team
  user?: {
    id: string
    email: string
    full_name?: string
  }
}

export interface CreateTeamInput {
  name: string
  slug?: string
  description?: string
  avatar_url?: string
  settings?: TeamSettings
}

export interface UpdateTeamInput {
  name?: string
  slug?: string
  description?: string
  avatar_url?: string
  settings?: TeamSettings
}

export interface InviteTeamMemberInput {
  email: string
  role: TeamRole
  message?: string
}

export interface ShareMeetingInput {
  meeting_id: string
  team_id?: string
  user_email?: string
  permission: SharePermission
  expires_at?: string
}

// Permission definitions
export const ROLE_PERMISSIONS: Record<TeamRole, string[]> = {
  owner: [
    'team.delete',
    'team.update',
    'team.settings',
    'member.invite',
    'member.remove',
    'member.update_role',
    'meeting.create',
    'meeting.edit',
    'meeting.delete',
    'meeting.share',
    'meeting.view'
  ],
  admin: [
    'team.update',
    'member.invite',
    'member.remove',
    'member.update_role',
    'meeting.create',
    'meeting.edit',
    'meeting.delete',
    'meeting.share',
    'meeting.view'
  ],
  member: [
    'meeting.create',
    'meeting.edit',
    'meeting.share',
    'meeting.view'
  ],
  viewer: [
    'meeting.view'
  ]
}

export function hasPermission(role: TeamRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false
}