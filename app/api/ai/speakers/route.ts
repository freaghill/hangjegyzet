import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { speakerAnalyzer } from '@/lib/ai/speaker-analysis'
import { trackMetric } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const speakerId = searchParams.get('speakerId')
    const organizationId = searchParams.get('organizationId')
    const analysisType = searchParams.get('type') || 'evolution'
    
    if (!speakerId || !organizationId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }
    
    // Verify user has access to organization
    const { data: memberCheck } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()
    
    if (!memberCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    let result
    
    switch (analysisType) {
      case 'evolution':
        result = await speakerAnalyzer.trackSpeakerAcrossMeetings(
          speakerId,
          organizationId,
          10
        )
        break
        
      case 'profile':
        // Get recent meeting with this speaker
        const { data: meeting } = await supabase
          .from('meetings')
          .select('transcript')
          .eq('organization_id', organizationId)
          .contains('participants', [speakerId])
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        
        if (!meeting || !meeting.transcript?.segments) {
          return NextResponse.json(
            { error: 'No transcript data available' },
            { status: 404 }
          )
        }
        
        const speakerSegments = meeting.transcript.segments.filter(
          (s: any) => s.speaker === speakerId
        )
        
        result = await speakerAnalyzer.profileCommunicationStyle(
          speakerId,
          speakerSegments
        )
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid analysis type' },
          { status: 400 }
        )
    }
    
    trackMetric('api.speaker_analysis_retrieved', 1, {
      organization_id: organizationId,
      analysis_type: analysisType
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in speaker analysis:', error)
    trackMetric('api.speaker_analysis_error', 1)
    
    return NextResponse.json(
      { error: 'Failed to analyze speaker' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { meetingId, speakerId, analysisType } = body
    
    if (!meetingId || !speakerId || !analysisType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Get meeting data
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*, organization_id')
      .eq('id', meetingId)
      .single()
    
    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    // Verify user has access
    const { data: memberCheck } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', user.id)
      .single()
    
    if (!memberCheck) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    if (!meeting.transcript?.segments) {
      return NextResponse.json(
        { error: 'No transcript available for analysis' },
        { status: 400 }
      )
    }
    
    // Filter segments for the speaker
    const speakerSegments = meeting.transcript.segments.filter(
      (s: any) => s.speaker === speakerId
    )
    
    if (speakerSegments.length === 0) {
      return NextResponse.json(
        { error: 'No data found for speaker' },
        { status: 404 }
      )
    }
    
    let result
    
    switch (analysisType) {
      case 'patterns':
        result = await speakerAnalyzer.analyzeSpeakingPatterns(
          speakerId,
          speakerSegments
        )
        break
        
      case 'emotional':
        result = await speakerAnalyzer.detectEmotionalTone(
          speakerId,
          speakerSegments,
          body.audioFeatures
        )
        break
        
      case 'communication':
        result = await speakerAnalyzer.profileCommunicationStyle(
          speakerId,
          speakerSegments,
          meeting.interactions
        )
        break
        
      case 'fingerprint':
        if (!body.audioFeatures) {
          return NextResponse.json(
            { error: 'Audio features required for fingerprint' },
            { status: 400 }
          )
        }
        
        result = await speakerAnalyzer.createVoiceFingerprint(
          speakerId,
          body.audioFeatures,
          speakerSegments
        )
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid analysis type' },
          { status: 400 }
        )
    }
    
    // Store analysis results
    const { error: storeError } = await supabase
      .from('speaker_analyses')
      .insert({
        meeting_id: meetingId,
        speaker_id: speakerId,
        organization_id: meeting.organization_id,
        analysis_type: analysisType,
        results: result,
        created_by: user.id
      })
    
    if (storeError) {
      console.error('Error storing analysis:', storeError)
    }
    
    trackMetric('api.speaker_analysis_created', 1, {
      organization_id: meeting.organization_id,
      analysis_type: analysisType
    })
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error analyzing speaker:', error)
    trackMetric('api.speaker_analysis_create_error', 1)
    
    return NextResponse.json(
      { error: 'Failed to analyze speaker' },
      { status: 500 }
    )
  }
}