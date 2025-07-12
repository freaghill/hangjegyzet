import { NextRequest, NextResponse } from 'next/server'
import { getStreamingTranscriptionService } from '@/lib/realtime/streaming-transcription'
import { createClient } from '@/lib/supabase/server'
import { validateFileUpload } from '@/lib/upload-validation'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes max for audio processing

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get meeting ID from headers
    const meetingId = request.headers.get('X-Meeting-ID')
    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
    }

    // Verify user has access to the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, organization_id')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Verify user belongs to the organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get audio data from request
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    
    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file required' }, { status: 400 })
    }

    // Validate file (5MB limit for real-time chunks)
    const maxChunkSize = 5 * 1024 * 1024
    if (audioFile.size > maxChunkSize) {
      return NextResponse.json(
        { 
          error: `Audio chunk too large. Maximum size is 5MB, received ${Math.round(audioFile.size / 1024 / 1024)}MB` 
        },
        { status: 413 }
      )
    }

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Process audio chunk
    const transcriptionService = getStreamingTranscriptionService()
    const result = await transcriptionService.processAudioChunk({
      meetingId,
      userId: user.id,
      chunk: buffer,
      timestamp: Date.now()
    })

    return NextResponse.json({
      success: true,
      transcription: result
    })

  } catch (error) {
    console.error('Audio processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process audio' },
      { status: 500 }
    )
  }
}