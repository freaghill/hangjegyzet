import { NextRequest, NextResponse } from 'next/server'
import { TeamService } from '@/lib/teams/team-service'

// GET /api/teams/[teamId]/members - Get team members
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const teamService = new TeamService()
    const members = await teamService.getTeamMembers(params.teamId)
    
    return NextResponse.json(members)
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team members' },
      { status: 500 }
    )
  }
}