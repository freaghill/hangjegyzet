import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enhancedProcessor } from '@/lib/transcription/enhanced-processor'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const {
      meetingId,
      startTime,
      endTime,
      language = 'hu',
      enablePreprocessing = true,
      enableMultiPass = true,
      enableVocabularyEnhancement = true,
      enableAccuracyMonitoring = true,
      multiPassCount = 2,
      temperatures = [0.0, 0.2],
      speakerCount,
      customVocabulary,
      contextHints,
      minAudioQuality,
      minConfidenceScore
    } = body

    // Validate meeting exists and user has access
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*, organizations!inner(*)')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Check user is member of organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if file exists
    if (!meeting.file_url) {
      return NextResponse.json({ error: 'No audio file found' }, { status: 400 })
    }

    // Check processing status
    if (meeting.status === 'processing') {
      return NextResponse.json({ error: 'Meeting is already being processed' }, { status: 409 })
    }

    // Process with enhanced transcription
    const result = await enhancedProcessor.process({
      organizationId: meeting.organization_id,
      meetingId,
      fileUrl: meeting.file_url,
      userId: user.id,
      startTime,
      endTime,
      language,
      enablePreprocessing,
      enableMultiPass,
      enableVocabularyEnhancement,
      enableAccuracyMonitoring,
      enableParallelProcessing: true,
      multiPassCount,
      temperatures,
      speakerCount,
      customVocabulary,
      contextHints,
      minAudioQuality,
      minConfidenceScore
    })

    if (!result.success) {
      return NextResponse.json({
        error: result.error || 'Transcription failed',
        warnings: result.warnings
      }, { status: 500 })
    }

    // Return enhanced result
    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      metadata: result.metadata,
      warnings: result.warnings
    })

  } catch (error) {
    console.error('Enhanced transcription API error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// GET endpoint to check transcription status
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get meeting ID from query params
    const { searchParams } = new URL(request.url)
    const meetingId = searchParams.get('meetingId')

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
    }

    // Get meeting with metadata
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, status, metadata, error_message, organization_id')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Check user has access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      status: meeting.status,
      metadata: meeting.metadata,
      error: meeting.error_message
    })

  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// PUT endpoint to provide feedback/corrections
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { meetingId, corrections } = body

    if (!meetingId || !corrections || !Array.isArray(corrections)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Validate meeting exists and user has access
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('organization_id')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Check user is member of organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Process feedback
    await enhancedProcessor.processFeedback(meetingId, corrections, user.id)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Feedback processing error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}