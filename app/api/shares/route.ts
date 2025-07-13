import { NextRequest, NextResponse } from 'next/server'
import { MeetingShareService } from '@/lib/teams/meeting-share-service'
import { ShareMeetingInput } from '@/lib/teams/types'

// POST /api/shares - Share a meeting
export async function POST(request: NextRequest) {
  try {
    const body: ShareMeetingInput = await request.json()
    
    if (!body.meeting_id) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      )
    }
    
    if (!body.team_id && !body.user_email) {
      return NextResponse.json(
        { error: 'Either team_id or user_email is required' },
        { status: 400 }
      )
    }
    
    const shareService = new MeetingShareService()
    const share = await shareService.shareMeeting(body)
    
    return NextResponse.json(share, { status: 201 })
  } catch (error) {
    console.error('Error sharing meeting:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to share meeting' },
      { status: error instanceof Error && error.message === 'Permission denied' ? 403 : 500 }
    )
  }
}