import { NextRequest, NextResponse } from 'next/server'
import { MeetingShareService } from '@/lib/teams/meeting-share-service'

// GET /api/meetings/[id]/shares - Get meeting shares
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shareService = new MeetingShareService()
    const shares = await shareService.getMeetingShares(params.id)
    
    return NextResponse.json(shares)
  } catch (error) {
    console.error('Error fetching meeting shares:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meeting shares' },
      { status: 500 }
    )
  }
}