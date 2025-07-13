import { NextRequest, NextResponse } from 'next/server'
import { TeamService } from '@/lib/teams/team-service'
import { createClient } from '@/lib/supabase/server'

// POST /api/teams/[teamId]/leave - Leave team
export async function POST(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const teamService = new TeamService()
    await teamService.removeMember(params.teamId, user.id)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error leaving team:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to leave team' },
      { status: 500 }
    )
  }
}