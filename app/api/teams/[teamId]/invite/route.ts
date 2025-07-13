import { NextRequest, NextResponse } from 'next/server'
import { TeamService } from '@/lib/teams/team-service'
import { InviteTeamMemberInput } from '@/lib/teams/types'
import { sendTeamInvitation } from '@/lib/email/send-team-invitation'

// POST /api/teams/[teamId]/invite - Invite a member
export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const body: InviteTeamMemberInput = await request.json()
    
    if (!body.email?.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }
    
    const teamService = new TeamService()
    const invitation = await teamService.inviteMember(params.teamId, body)
    
    // Get team details for email
    const team = await teamService.getTeam(params.teamId)
    if (!team) {
      throw new Error('Team not found')
    }
    
    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/teams/invite?token=${invitation.token}`
    
    await sendTeamInvitation({
      to: invitation.email,
      teamName: team.name,
      inviterName: invitation.metadata?.inviter_name || 'Someone',
      inviterEmail: '', // TODO: Get inviter email
      role: invitation.role,
      inviteUrl,
      message: body.message,
      expiresAt: invitation.expires_at
    })
    
    return NextResponse.json(invitation, { status: 201 })
  } catch (error) {
    console.error('Error inviting member:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invitation' },
      { status: error instanceof Error && error.message === 'Permission denied' ? 403 : 500 }
    )
  }
}