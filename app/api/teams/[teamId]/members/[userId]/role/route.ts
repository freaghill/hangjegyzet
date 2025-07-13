import { NextRequest, NextResponse } from 'next/server'
import { TeamService } from '@/lib/teams/team-service'
import { TeamRole } from '@/lib/teams/types'

// PATCH /api/teams/[teamId]/members/[userId]/role - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { teamId: string; userId: string } }
) {
  try {
    const { role } = await request.json()
    
    if (!role || !['owner', 'admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }
    
    const teamService = new TeamService()
    const member = await teamService.updateMemberRole(
      params.teamId, 
      params.userId, 
      role as TeamRole
    )
    
    return NextResponse.json(member)
  } catch (error) {
    console.error('Error updating member role:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update member role' },
      { status: error instanceof Error && error.message === 'Permission denied' ? 403 : 500 }
    )
  }
}