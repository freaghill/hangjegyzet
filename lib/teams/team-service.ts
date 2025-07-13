import { createClient } from '@/lib/supabase/server'
import { 
  Team, 
  TeamMember, 
  TeamInvitation,
  CreateTeamInput, 
  UpdateTeamInput,
  InviteTeamMemberInput,
  TeamRole 
} from './types'
import { nanoid } from 'nanoid'

export class TeamService {
  private supabase

  constructor() {
    this.supabase = createClient()
  }

  // Team CRUD operations
  async createTeam(input: CreateTeamInput): Promise<Team> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Generate slug if not provided
    const slug = input.slug || this.generateSlug(input.name)

    // Use the database function to create team with owner
    const { data: team, error } = await this.supabase
      .rpc('create_team_with_owner', {
        p_name: input.name,
        p_slug: slug,
        p_description: input.description,
        p_avatar_url: input.avatar_url
      })

    if (error) throw error
    
    // Update settings if provided
    if (input.settings) {
      const { error: updateError } = await this.supabase
        .from('teams')
        .update({ settings: input.settings })
        .eq('id', team.id)
      
      if (updateError) throw updateError
    }

    return {
      ...team,
      current_user_role: 'owner' as TeamRole,
      member_count: 1
    }
  }

  async getTeam(teamId: string): Promise<Team | null> {
    const { data: team, error } = await this.supabase
      .from('teams')
      .select(`
        *,
        team_members!inner(
          role,
          user_id
        )
      `)
      .eq('id', teamId)
      .single()

    if (error || !team) return null

    // Get current user's role
    const { data: { user } } = await this.supabase.auth.getUser()
    const currentUserMember = team.team_members.find(
      (m: any) => m.user_id === user?.id
    )

    // Count members
    const { count } = await this.supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)

    return {
      id: team.id,
      name: team.name,
      slug: team.slug,
      description: team.description,
      avatar_url: team.avatar_url,
      settings: team.settings,
      created_at: team.created_at,
      updated_at: team.updated_at,
      created_by: team.created_by,
      current_user_role: currentUserMember?.role,
      member_count: count || 0
    }
  }

  async getUserTeams(): Promise<Team[]> {
    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) return []

    const { data: teamMembers, error } = await this.supabase
      .from('team_members')
      .select(`
        role,
        team:teams(*)
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })

    if (error || !teamMembers) return []

    // Fetch member counts for each team
    const teamIds = teamMembers.map(tm => tm.team.id)
    const { data: memberCounts } = await this.supabase
      .from('team_members')
      .select('team_id')
      .in('team_id', teamIds)

    const countMap = memberCounts?.reduce((acc: any, m: any) => {
      acc[m.team_id] = (acc[m.team_id] || 0) + 1
      return acc
    }, {}) || {}

    return teamMembers.map(tm => ({
      ...tm.team,
      current_user_role: tm.role,
      member_count: countMap[tm.team.id] || 0
    }))
  }

  async updateTeam(teamId: string, input: UpdateTeamInput): Promise<Team> {
    // Check permission
    const canUpdate = await this.checkPermission(teamId, 'team.update')
    if (!canUpdate) throw new Error('Permission denied')

    const updates: any = {
      updated_at: new Date().toISOString()
    }
    
    if (input.name !== undefined) updates.name = input.name
    if (input.slug !== undefined) updates.slug = input.slug
    if (input.description !== undefined) updates.description = input.description
    if (input.avatar_url !== undefined) updates.avatar_url = input.avatar_url
    if (input.settings !== undefined) updates.settings = input.settings

    const { data: team, error } = await this.supabase
      .from('teams')
      .update(updates)
      .eq('id', teamId)
      .select()
      .single()

    if (error) throw error
    
    return this.getTeam(teamId) as Promise<Team>
  }

  async deleteTeam(teamId: string): Promise<void> {
    // Check permission
    const canDelete = await this.checkPermission(teamId, 'team.delete')
    if (!canDelete) throw new Error('Permission denied')

    const { error } = await this.supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (error) throw error
  }

  // Member management
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data: members, error } = await this.supabase
      .from('team_members')
      .select(`
        *,
        user:auth.users(
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true })

    if (error) throw error

    return members.map(m => ({
      id: m.id,
      team_id: m.team_id,
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      invited_by: m.invited_by,
      user: m.user ? {
        id: m.user.id,
        email: m.user.email,
        full_name: m.user.raw_user_meta_data?.full_name,
        avatar_url: m.user.raw_user_meta_data?.avatar_url
      } : undefined
    }))
  }

  async updateMemberRole(
    teamId: string, 
    userId: string, 
    role: TeamRole
  ): Promise<TeamMember> {
    // Check permission
    const canUpdate = await this.checkPermission(teamId, 'member.update_role')
    if (!canUpdate) throw new Error('Permission denied')

    // Prevent removing last owner
    if (role !== 'owner') {
      const { count } = await this.supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('role', 'owner')

      if (count === 1) {
        const { data: currentOwner } = await this.supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', teamId)
          .eq('role', 'owner')
          .single()

        if (currentOwner?.user_id === userId) {
          throw new Error('Cannot remove last owner from team')
        }
      }
    }

    const { data: member, error } = await this.supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    
    return member
  }

  async removeMember(teamId: string, userId: string): Promise<void> {
    // Check permission or if user is removing themselves
    const { data: { user } } = await this.supabase.auth.getUser()
    const canRemove = await this.checkPermission(teamId, 'member.remove')
    const isSelf = user?.id === userId

    if (!canRemove && !isSelf) {
      throw new Error('Permission denied')
    }

    // Prevent removing last owner
    const { data: member } = await this.supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single()

    if (member?.role === 'owner') {
      const { count } = await this.supabase
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)
        .eq('role', 'owner')

      if (count === 1) {
        throw new Error('Cannot remove last owner from team')
      }
    }

    const { error } = await this.supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (error) throw error
  }

  // Invitation management
  async inviteMember(
    teamId: string, 
    input: InviteTeamMemberInput
  ): Promise<TeamInvitation> {
    // Check permission
    const canInvite = await this.checkPermission(teamId, 'member.invite')
    if (!canInvite) throw new Error('Permission denied')

    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    // Check if user is already a member
    const { data: existingMember } = await this.supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      throw new Error('User is already a team member')
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await this.supabase
      .from('team_invitations')
      .select('id')
      .eq('team_id', teamId)
      .eq('email', input.email)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      throw new Error('An invitation is already pending for this email')
    }

    // Create invitation
    const token = nanoid(32)
    const { data: invitation, error } = await this.supabase
      .from('team_invitations')
      .insert({
        team_id: teamId,
        email: input.email,
        role: input.role,
        token,
        invited_by: user.id,
        metadata: {
          message: input.message,
          inviter_name: user.user_metadata?.full_name || user.email
        }
      })
      .select()
      .single()

    if (error) throw error

    // Send invitation email
    await this.sendInvitationEmail(invitation, teamId)

    return invitation
  }

  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    const { data: invitations, error } = await this.supabase
      .from('team_invitations')
      .select('*')
      .eq('team_id', teamId)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .order('invited_at', { ascending: false })

    if (error) throw error
    
    return invitations
  }

  async acceptInvitation(token: string): Promise<TeamMember> {
    const { data: member, error } = await this.supabase
      .rpc('accept_team_invitation', { p_token: token })

    if (error) throw error
    
    return member
  }

  async revokeInvitation(teamId: string, invitationId: string): Promise<void> {
    // Check permission
    const canRevoke = await this.checkPermission(teamId, 'member.invite')
    if (!canRevoke) throw new Error('Permission denied')

    const { error } = await this.supabase
      .from('team_invitations')
      .delete()
      .eq('id', invitationId)
      .eq('team_id', teamId)

    if (error) throw error
  }

  // Helper methods
  private async checkPermission(
    teamId: string, 
    permission: string
  ): Promise<boolean> {
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
    return hasPermission(member.role, permission)
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + nanoid(6)
  }

  private async sendInvitationEmail(
    invitation: TeamInvitation, 
    teamId: string
  ): Promise<void> {
    // Get team details
    const team = await this.getTeam(teamId)
    if (!team) return

    // Get inviter details
    const { data: inviter } = await this.supabase
      .from('auth.users')
      .select('email, raw_user_meta_data')
      .eq('id', invitation.invited_by)
      .single()

    const inviterName = inviter?.raw_user_meta_data?.full_name || inviter?.email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/teams/invite?token=${invitation.token}`

    // Send email using your email service
    // This is a placeholder - implement with your email service
    console.log('Sending invitation email:', {
      to: invitation.email,
      team: team.name,
      inviter: inviterName,
      role: invitation.role,
      url: inviteUrl
    })
  }
}