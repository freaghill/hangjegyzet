import { createClient } from '@/lib/supabase/server'
import { MeetingShare, ShareMeetingInput, SharePermission } from './types'

export class MeetingShareService {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  async shareMeeting(input: ShareMeetingInput): Promise<MeetingShare> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Verify user owns the meeting or has permission to share
    const { data: meeting } = await this.supabase
      .from('meetings')
      .select('id, user_id, team_id')
      .eq('id', input.meeting_id)
      .single()

    if (!meeting) throw new Error('Meeting not found')

    // Check if user can share
    const canShare = meeting.user_id === user.id || 
      (meeting.team_id && await this.canShareTeamMeeting(meeting.team_id))

    if (!canShare) throw new Error('Permission denied')

    // Prepare share data
    const shareData: any = {
      meeting_id: input.meeting_id,
      permission: input.permission,
      shared_by: user.id,
      expires_at: input.expires_at
    }

    // Determine share target
    if (input.team_id) {
      // Verify team exists
      const { data: team } = await this.supabase
        .from('teams')
        .select('id')
        .eq('id', input.team_id)
        .single()

      if (!team) throw new Error('Team not found')
      shareData.team_id = input.team_id
    } else if (input.user_email) {
      // Find user by email
      const { data: targetUser } = await this.supabase
        .from('auth.users')
        .select('id')
        .eq('email', input.user_email)
        .single()

      if (!targetUser) throw new Error('User not found')
      shareData.user_id = targetUser.id
    } else {
      throw new Error('Either team_id or user_email must be provided')
    }

    // Create or update share
    const { data: share, error } = await this.supabase
      .from('meeting_shares')
      .upsert(shareData, {
        onConflict: shareData.team_id ? 'meeting_id,team_id' : 'meeting_id,user_id'
      })
      .select(`
        *,
        meeting:meetings(id, title, created_at),
        team:teams(id, name, slug),
        user:auth.users(id, email, raw_user_meta_data)
      `)
      .single()

    if (error) throw error

    // Format response
    return {
      ...share,
      user: share.user ? {
        id: share.user.id,
        email: share.user.email,
        full_name: share.user.raw_user_meta_data?.full_name
      } : undefined
    }
  }

  async getMeetingShares(meetingId: string): Promise<MeetingShare[]> {
    const { data: shares, error } = await this.supabase
      .from('meeting_shares')
      .select(`
        *,
        team:teams(id, name, slug),
        user:auth.users(id, email, raw_user_meta_data)
      `)
      .eq('meeting_id', meetingId)
      .order('shared_at', { ascending: false })

    if (error) throw error

    return shares.map(share => ({
      ...share,
      user: share.user ? {
        id: share.user.id,
        email: share.user.email,
        full_name: share.user.raw_user_meta_data?.full_name
      } : undefined
    }))
  }

  async getSharedMeetings(teamId?: string): Promise<MeetingShare[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return []

    let query = this.supabase
      .from('meeting_shares')
      .select(`
        *,
        meeting:meetings(
          id, 
          title, 
          created_at,
          duration_seconds,
          status,
          summary,
          user:auth.users(email, raw_user_meta_data)
        )
      `)

    if (teamId) {
      query = query.eq('team_id', teamId)
    } else {
      query = query.eq('user_id', user.id)
    }

    const { data: shares, error } = await query
      .order('shared_at', { ascending: false })

    if (error) throw error

    return shares.map(share => ({
      ...share,
      meeting: share.meeting ? {
        ...share.meeting,
        user: share.meeting.user ? {
          email: share.meeting.user.email,
          full_name: share.meeting.user.raw_user_meta_data?.full_name
        } : undefined
      } : undefined
    }))
  }

  async updateSharePermission(
    shareId: string, 
    permission: SharePermission
  ): Promise<MeetingShare> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Verify user can update this share
    const { data: share } = await this.supabase
      .from('meeting_shares')
      .select(`
        *,
        meeting:meetings(user_id)
      `)
      .eq('id', shareId)
      .single()

    if (!share) throw new Error('Share not found')
    
    const canUpdate = share.shared_by === user.id || 
      share.meeting?.user_id === user.id

    if (!canUpdate) throw new Error('Permission denied')

    const { data: updated, error } = await this.supabase
      .from('meeting_shares')
      .update({ permission })
      .eq('id', shareId)
      .select()
      .single()

    if (error) throw error
    
    return updated
  }

  async revokeShare(shareId: string): Promise<void> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Verify user can revoke this share
    const { data: share } = await this.supabase
      .from('meeting_shares')
      .select(`
        *,
        meeting:meetings(user_id)
      `)
      .eq('id', shareId)
      .single()

    if (!share) throw new Error('Share not found')
    
    const canRevoke = share.shared_by === user.id || 
      share.meeting?.user_id === user.id

    if (!canRevoke) throw new Error('Permission denied')

    const { error } = await this.supabase
      .from('meeting_shares')
      .delete()
      .eq('id', shareId)

    if (error) throw error
  }

  async checkMeetingAccess(
    meetingId: string, 
    requiredPermission?: SharePermission
  ): Promise<boolean> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return false

    // Check if user owns the meeting
    const { data: meeting } = await this.supabase
      .from('meetings')
      .select('user_id, team_id')
      .eq('id', meetingId)
      .single()

    if (!meeting) return false
    if (meeting.user_id === user.id) return true

    // Check team access
    if (meeting.team_id) {
      const { data: teamMember } = await this.supabase
        .from('team_members')
        .select('role')
        .eq('team_id', meeting.team_id)
        .eq('user_id', user.id)
        .single()

      if (teamMember) return true
    }

    // Check direct share
    const { data: share } = await this.supabase
      .from('meeting_shares')
      .select('permission')
      .eq('meeting_id', meetingId)
      .eq('user_id', user.id)
      .single()

    if (!share) {
      // Check team shares
      const { data: userTeams } = await this.supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)

      if (userTeams && userTeams.length > 0) {
        const teamIds = userTeams.map(t => t.team_id)
        const { data: teamShare } = await this.supabase
          .from('meeting_shares')
          .select('permission')
          .eq('meeting_id', meetingId)
          .in('team_id', teamIds)
          .single()

        if (teamShare) {
          return this.hasSharePermission(teamShare.permission, requiredPermission)
        }
      }
      
      return false
    }

    return this.hasSharePermission(share.permission, requiredPermission)
  }

  private async canShareTeamMeeting(teamId: string): Promise<boolean> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return false

    const { data: member } = await this.supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!member) return false

    const { hasPermission } = await import('./types')
    return hasPermission(member.role, 'meeting.share')
  }

  private hasSharePermission(
    userPermission: SharePermission, 
    requiredPermission?: SharePermission
  ): boolean {
    if (!requiredPermission) return true

    const permissionLevels: Record<SharePermission, number> = {
      view: 1,
      comment: 2,
      edit: 3
    }

    return permissionLevels[userPermission] >= permissionLevels[requiredPermission]
  }
}