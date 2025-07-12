import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { highlightsGenerator } from '@/lib/ai/highlights'
import { notificationManager } from '@/lib/notifications/manager'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get meeting with transcript
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('id, title, transcript, highlights, user_id, organization_id, profiles!meetings_created_by_fkey(organization_id)')
      .eq('id', params.id)
      .single()
    
    if (error || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    // Check authorization
    if (meeting.user_id !== user.id) {
      // Check if user belongs to the same organization
      if (meeting.organization_id) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', meeting.organization_id)
          .eq('user_id', user.id)
          .single()
        
        if (!membership) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    // Return existing highlights if available
    if (meeting.highlights) {
      return NextResponse.json(meeting.highlights)
    }
    
    // Check if transcript is available
    if (!meeting.transcript?.text) {
      return NextResponse.json(
        { error: 'No transcript available for highlights generation' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Highlights not generated. Use POST to generate.' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Get highlights error:', error)
    return NextResponse.json(
      { error: 'Failed to get highlights' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get meeting with transcript
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('id, title, transcript, highlights, user_id, organization_id, profiles!meetings_created_by_fkey(organization_id)')
      .eq('id', params.id)
      .single()
    
    if (error || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    // Check authorization
    if (meeting.user_id !== user.id) {
      // Check if user belongs to the same organization
      if (meeting.organization_id) {
        const { data: membership } = await supabase
          .from('organization_members')
          .select('id')
          .eq('organization_id', meeting.organization_id)
          .eq('user_id', user.id)
          .single()
        
        if (!membership) {
          return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 403 }
          )
        }
      } else {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        )
      }
    }
    
    // Check if highlights already exist
    if (meeting.highlights && !request.nextUrl.searchParams.get('regenerate')) {
      return NextResponse.json(meeting.highlights)
    }
    
    // Check if transcript is available
    if (!meeting.transcript?.text) {
      return NextResponse.json(
        { error: 'No transcript available for highlights generation' },
        { status: 400 }
      )
    }
    
    // Generate highlights
    const highlights = await highlightsGenerator.generateHighlights(
      meeting.transcript.text,
      meeting.transcript.segments,
      meeting.title
    )
    
    // Save highlights
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        highlights,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
    
    if (updateError) {
      throw updateError
    }
    
    // Send notification for highlights created
    const organizationId = meeting.profiles?.organization_id || meeting.organization_id
    if (organizationId && highlights.length > 0) {
      try {
        await notificationManager.sendNotification({
          eventType: 'highlight_created',
          organizationId: organizationId,
          meetingId: params.id,
          data: {
            meetingTitle: meeting.title || 'Névtelen megbeszélés',
            meetingId: params.id,
            highlights: highlights.map((h: any) => ({
              text: h.text,
              speaker: h.speaker,
              timestamp: h.timestamp?.toString() || '0'
            }))
          }
        })
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError)
        // Don't fail the request if notification fails
      }
    }
    
    return NextResponse.json(highlights)
  } catch (error) {
    console.error('Generate highlights error:', error)
    return NextResponse.json(
      { error: 'Failed to generate highlights' },
      { status: 500 }
    )
  }
}