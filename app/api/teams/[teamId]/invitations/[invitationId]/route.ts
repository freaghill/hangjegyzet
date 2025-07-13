import { NextRequest, NextResponse } from 'next/server'
import { TeamService } from '@/lib/teams/team-service'

// DELETE /api/teams/[teamId]/invitations/[invitationId] - Revoke invitation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string; invitationId: string } }
) {
  try {
    const teamService = new TeamService()
    await teamService.revokeInvitation(params.teamId, params.invitationId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error revoking invitation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to revoke invitation' },
      { status: error instanceof Error && error.message === 'Permission denied' ? 403 : 500 }
    )
  }
}