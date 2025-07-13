import { NextRequest, NextResponse } from 'next/server'
import { MeetingShareService } from '@/lib/teams/meeting-share-service'
import { SharePermission } from '@/lib/teams/types'

// PATCH /api/shares/[shareId] - Update share permission
export async function PATCH(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const { permission } = await request.json()
    
    if (!permission || !['view', 'comment', 'edit'].includes(permission)) {
      return NextResponse.json(
        { error: 'Invalid permission' },
        { status: 400 }
      )
    }
    
    const shareService = new MeetingShareService()
    const share = await shareService.updateSharePermission(
      params.shareId, 
      permission as SharePermission
    )
    
    return NextResponse.json(share)
  } catch (error) {
    console.error('Error updating share:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update share' },
      { status: error instanceof Error && error.message === 'Permission denied' ? 403 : 500 }
    )
  }
}

// DELETE /api/shares/[shareId] - Remove share
export async function DELETE(
  request: NextRequest,
  { params }: { params: { shareId: string } }
) {
  try {
    const shareService = new MeetingShareService()
    await shareService.revokeShare(params.shareId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing share:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove share' },
      { status: error instanceof Error && error.message === 'Permission denied' ? 403 : 500 }
    )
  }
}