import { NextRequest, NextResponse } from 'next/server'
import { TeamService } from '@/lib/teams/team-service'
import { CreateTeamInput } from '@/lib/teams/types'

// GET /api/teams - Get user's teams
export async function GET(request: NextRequest) {
  try {
    const teamService = new TeamService()
    const teams = await teamService.getUserTeams()
    
    return NextResponse.json(teams)
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// POST /api/teams - Create a new team
export async function POST(request: NextRequest) {
  try {
    const body: CreateTeamInput = await request.json()
    
    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: 'Team name is required' },
        { status: 400 }
      )
    }
    
    const teamService = new TeamService()
    const team = await teamService.createTeam(body)
    
    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create team' },
      { status: 500 }
    )
  }
}