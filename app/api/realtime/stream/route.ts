import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStreamingTranscriptionService } from '@/lib/realtime/streaming-transcription'
import { getRealtimeDataPipeline } from '@/lib/realtime/data-pipeline'
import { Readable } from 'stream'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max for streaming

// POST endpoint for audio streaming
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
    
    // Get meeting ID from headers or body
    const meetingId = request.headers.get('x-meeting-id')
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      )
    }
    
    // Verify user has access to the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, organization_id, status')
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
    
    // Check if meeting is in a valid state for streaming
    if (meeting.status !== 'processing' && meeting.status !== 'uploading') {
      return NextResponse.json(
        { error: 'Meeting is not in a valid state for streaming' },
        { status: 400 }
      )
    }
    
    // Initialize data pipeline for the meeting
    const pipeline = getRealtimeDataPipeline()
    await pipeline.initializeMeeting(meetingId)
    
    // Set up streaming
    const transcriptionService = getStreamingTranscriptionService()
    
    // Create readable stream from request body
    const reader = request.body?.getReader()
    if (!reader) {
      return NextResponse.json(
        { error: 'No audio stream provided' },
        { status: 400 }
      )
    }
    
    // Create Node.js readable stream
    const audioStream = new Readable({
      async read() {
        try {
          const { done, value } = await reader.read()
          if (done) {
            this.push(null)
          } else {
            this.push(Buffer.from(value))
          }
        } catch (error) {
          this.destroy(error as Error)
        }
      }
    })
    
    // Process audio stream
    transcriptionService.processAudioStream(meetingId, user.id, audioStream)
    
    // Set up pipeline event listeners
    pipeline.on('segment:processed', async (processed) => {
      // Update meeting with latest transcript
      if (processed.segment.meetingId === meetingId) {
        await supabase
          .from('meetings')
          .update({
            status: 'processing',
            updated_at: new Date().toISOString(),
          })
          .eq('id', meetingId)
      }
    })
    
    // Return success response
    return NextResponse.json({
      success: true,
      meetingId,
      message: 'Audio streaming started',
    })
  } catch (error) {
    console.error('Audio streaming error:', error)
    return NextResponse.json(
      { error: 'Failed to process audio stream' },
      { status: 500 }
    )
  }
}

// GET endpoint for stream status
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
    
    // Get pipeline metrics
    const pipeline = getRealtimeDataPipeline()
    const metrics = pipeline.getMetrics(meetingId)
    const context = pipeline.getMeetingContext(meetingId)
    
    if (!metrics || !context) {
      return NextResponse.json(
        { error: 'No active stream for this meeting' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      meetingId,
      status: 'active',
      metrics: {
        totalSegments: metrics.totalSegments,
        averageLatency: Math.round(metrics.averageLatency),
        errorRate: metrics.errorRate,
        throughput: metrics.throughput,
      },
      context: {
        participants: context.participants.length,
        duration: Math.floor((Date.now() - context.startTime) / 1000),
        language: context.language,
        topics: context.topics,
      },
    })
  } catch (error) {
    console.error('Stream status error:', error)
    return NextResponse.json(
      { error: 'Failed to get stream status' },
      { status: 500 }
    )
  }
}

// DELETE endpoint to stop streaming
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
    
    const meetingId = request.headers.get('x-meeting-id')
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      )
    }
    
    // Stop transcription service
    const transcriptionService = getStreamingTranscriptionService()
    transcriptionService.stopTranscription(meetingId)
    
    // End meeting in pipeline
    const pipeline = getRealtimeDataPipeline()
    await pipeline.endMeeting(meetingId)
    
    // Update meeting status
    await supabase
      .from('meetings')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId)
    
    return NextResponse.json({
      success: true,
      meetingId,
      message: 'Audio streaming stopped',
    })
  } catch (error) {
    console.error('Stop streaming error:', error)
    return NextResponse.json(
      { error: 'Failed to stop audio stream' },
      { status: 500 }
    )
  }
}