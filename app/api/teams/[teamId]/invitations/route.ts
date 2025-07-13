import { NextRequest, NextResponse } from 'next/server'
import { TeamService } from '@/lib/teams/team-service'

// GET /api/teams/[teamId]/invitations - Get pending invitations
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const teamService = new TeamService()
    const invitations = await teamService.getTeamInvitations(params.teamId)
    
    return NextResponse.json(invitations)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}