import { NextRequest, NextResponse } from 'next/server'
import { TeamService } from '@/lib/teams/team-service'
import { UpdateTeamInput } from '@/lib/teams/types'

// GET /api/teams/[teamId] - Get team details
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const teamService = new TeamService()
    const team = await teamService.getTeam(params.teamId)
    
    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(team)
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json(
      { error: 'Failed to fetch team' },
      { status: 500 }
    )
  }
}

// PATCH /api/teams/[teamId] - Update team
export async function PATCH(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const body: UpdateTeamInput = await request.json()
    const teamService = new TeamService()
    const team = await teamService.updateTeam(params.teamId, body)
    
    return NextResponse.json(team)
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update team' },
      { status: error instanceof Error && error.message === 'Permission denied' ? 403 : 500 }
    )
  }
}

// DELETE /api/teams/[teamId] - Delete team
export async function DELETE(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const teamService = new TeamService()
    await teamService.deleteTeam(params.teamId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete team' },
      { status: error instanceof Error && error.message === 'Permission denied' ? 403 : 500 }
    )
  }
}