import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRealtimeDataPipeline } from '@/lib/realtime/data-pipeline'

export const runtime = 'nodejs'

// GET endpoint for live transcript access
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const meetingId = request.nextUrl.searchParams.get('meetingId')
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      )
    }
    
    // Verify user has access to the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select(`
        id,
        organization_id,
        title,
        status,
        transcript,
        speakers,
        duration_seconds,
        created_at,
        organizations!inner(name)
      `)
      .eq('id', meetingId)
      .single()
    
    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    // Verify user belongs to the organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.organization_id !== meeting.organization_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Get live context if meeting is active
    const pipeline = getRealtimeDataPipeline()
    const liveContext = pipeline.getMeetingContext(meetingId)
    const metrics = pipeline.getMetrics(meetingId)
    
    // Get transcript segments from database
    const { data: segments, error: segmentsError } = await supabase
      .from('meeting_transcripts')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('start_time', { ascending: true })
    
    if (segmentsError) {
      console.error('Failed to fetch transcript segments:', segmentsError)
    }
    
    // Format response
    const response = {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        organization: (meeting.organizations as any).name,
        status: meeting.status,
        duration: meeting.duration_seconds || (liveContext ? Math.floor((Date.now() - liveContext.startTime) / 1000) : 0),
        createdAt: meeting.created_at,
      },
      transcript: meeting.transcript || [],
      segments: segments || [],
      speakers: meeting.speakers || liveContext?.participants || [],
      live: !!liveContext,
      liveData: liveContext ? {
        participants: liveContext.participants,
        topics: liveContext.topics,
        startTime: liveContext.startTime,
        isActive: true,
      } : null,
      metrics: metrics ? {
        totalSegments: metrics.totalSegments,
        averageLatency: Math.round(metrics.averageLatency),
        errorRate: metrics.errorRate,
        throughput: metrics.throughput,
      } : null,
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Live transcript error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live transcript' },
      { status: 500 }
    )
  }
}

// POST endpoint for manual transcript updates
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { meetingId, text, speaker, timestamp } = body
    
    if (!meetingId || !text) {
      return NextResponse.json(
        { error: 'Meeting ID and text are required' },
        { status: 400 }
      )
    }
    
    // Verify user has access to the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('organization_id')
      .eq('id', meetingId)
      .single()
    
    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    // Verify user belongs to the organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, name')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.organization_id !== meeting.organization_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Insert manual transcript segment
    const { data: segment, error: insertError } = await supabase
      .from('meeting_transcripts')
      .insert({
        meeting_id: meetingId,
        text,
        speaker: speaker || profile.name || 'Unknown',
        start_time: timestamp || Date.now(),
        end_time: (timestamp || Date.now()) + 1000, // 1 second duration for manual entries
        confidence: 1.0, // Manual entries have full confidence
        language: 'hu',
        metadata: {
          manual: true,
          addedBy: user.id,
          addedAt: new Date().toISOString(),
        },
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('Failed to insert transcript segment:', insertError)
      return NextResponse.json(
        { error: 'Failed to add transcript segment' },
        { status: 500 }
      )
    }
    
    // If meeting is live, inject into pipeline
    const pipeline = getRealtimeDataPipeline()
    const liveContext = pipeline.getMeetingContext(meetingId)
    
    if (liveContext) {
      await pipeline.ingestSegment({
        id: segment.id,
        meetingId,
        text,
        speaker: speaker || profile.name || 'Unknown',
        startTime: timestamp || Date.now(),
        endTime: (timestamp || Date.now()) + 1000,
        confidence: 1.0,
        language: 'hu',
        metadata: {
          manual: true,
          addedBy: user.id,
        },
      })
    }
    
    return NextResponse.json({
      success: true,
      segment,
    })
  } catch (error) {
    console.error('Manual transcript error:', error)
    return NextResponse.json(
      { error: 'Failed to add transcript segment' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to clear transcript
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const meetingId = request.nextUrl.searchParams.get('meetingId')
    const segmentId = request.nextUrl.searchParams.get('segmentId')
    
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      )
    }
    
    // Verify user has admin access to the meeting
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile || (profile.role !== 'owner' && profile.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }
    
    // Verify meeting belongs to user's organization
    const { data: meeting } = await supabase
      .from('meetings')
      .select('organization_id')
      .eq('id', meetingId)
      .single()
    
    if (!meeting || meeting.organization_id !== profile.organization_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    if (segmentId) {
      // Delete specific segment
      const { error: deleteError } = await supabase
        .from('meeting_transcripts')
        .delete()
        .eq('id', segmentId)
        .eq('meeting_id', meetingId)
      
      if (deleteError) {
        console.error('Failed to delete segment:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete segment' },
          { status: 500 }
        )
      }
    } else {
      // Clear all transcripts for the meeting
      const { error: deleteError } = await supabase
        .from('meeting_transcripts')
        .delete()
        .eq('meeting_id', meetingId)
      
      if (deleteError) {
        console.error('Failed to clear transcripts:', deleteError)
        return NextResponse.json(
          { error: 'Failed to clear transcripts' },
          { status: 500 }
        )
      }
      
      // Clear transcript from meeting record
      await supabase
        .from('meetings')
        .update({
          transcript: null,
          speakers: [],
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId)
    }
    
    return NextResponse.json({
      success: true,
      message: segmentId ? 'Segment deleted' : 'Transcripts cleared',
    })
  } catch (error) {
    console.error('Delete transcript error:', error)
    return NextResponse.json(
      { error: 'Failed to delete transcript' },
      { status: 500 }
    )
  }
}