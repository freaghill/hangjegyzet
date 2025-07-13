import { NextRequest, NextResponse } from 'next/server'
import { TeamService } from '@/lib/teams/team-service'

// POST /api/teams/invite/accept - Accept team invitation
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }
    
    const teamService = new TeamService()
    const member = await teamService.acceptInvitation(token)
    
    return NextResponse.json({
      success: true,
      teamId: member.team_id
    })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}