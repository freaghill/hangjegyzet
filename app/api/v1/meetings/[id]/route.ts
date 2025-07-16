import { NextRequest, NextResponse } from 'next/server'
import { withApiAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: {
    id: string
  }
}

/**
 * GET /api/v1/meetings/:id - Get meeting details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return withApiAuth<any>(async (_request, context) => {
    const supabase = await createClient()
    
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', context.organizationId)
      .single()
    
    if (error || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      id: meeting.id,
      title: meeting.title,
      status: meeting.status,
      duration_seconds: meeting.duration_seconds,
      created_at: meeting.created_at,
      updated_at: meeting.updated_at,
      transcript: meeting.transcript,
      summary: meeting.summary,
      action_items: meeting.action_items,
      speakers: meeting.speakers,
      intelligence_score: meeting.intelligence_score,
      metadata: meeting.metadata
    })
  }, { resource: 'meetings', action: 'read' })(request)
}

/**
 * DELETE /api/v1/meetings/:id - Delete a meeting
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return withApiAuth<any>(async (_request, context) => {
    const supabase = await createClient()
    
    // Check if meeting exists and belongs to organization
    const { data: meeting } = await supabase
      .from('meetings')
      .select('id')
      .eq('id', params.id)
      .eq('organization_id', context.organizationId)
      .single()
    
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    // Delete meeting
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', params.id)
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete meeting' },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { message: 'Meeting deleted successfully' },
      { status: 200 }
    )
  }, { resource: 'meetings', action: 'write' })(request)
}