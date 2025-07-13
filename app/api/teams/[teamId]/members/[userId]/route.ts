import { NextRequest, NextResponse } from 'next/server'
import { TeamService } from '@/lib/teams/team-service'

// DELETE /api/teams/[teamId]/members/[userId] - Remove team member
export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string; userId: string } }
) {
  try {
    const teamService = new TeamService()
    await teamService.removeMember(params.teamId, params.userId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing team member:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove team member' },
      { status: error instanceof Error && error.message === 'Permission denied' ? 403 : 500 }
    )
  }
}