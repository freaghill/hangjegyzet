import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { meetingAnalyticsEngine } from '@/lib/ai/meeting-analytics'
import { trackMetric } from '@/lib/monitoring'

export async function GET(request: NextRequest) {
  try {
    // Note: Rate limiting for analytics endpoint would need to be implemented
    // For now, we'll skip rate limiting for this endpoint
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get meeting ID from query params
    const { searchParams } = new URL(request.url)
    const meetingId = searchParams.get('meetingId')
    
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      )
    }
    
    // Check if user has access to the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, organization_id')
      .eq('id', meetingId)
      .single()
    
    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    // Verify user belongs to the organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', user.id)
      .single()
    
    if (!member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    // Generate analytics
    const startTime = Date.now()
    const analytics = await meetingAnalyticsEngine.analyzeMeeting(meetingId)
    
    // Track API usage
    trackMetric('api.ai.analytics.success', 1, {
      user_id: user.id,
      organization_id: meeting.organization_id,
      processing_time: String(Date.now() - startTime)
    })
    
    // Cache the results for 1 hour
    const headers = new Headers()
    headers.set('Cache-Control', 'private, max-age=3600')
    
    return NextResponse.json(
      {
        success: true,
        data: analytics,
        generated_at: new Date().toISOString()
      },
      { headers }
    )
  } catch (error) {
    console.error('Analytics API error:', error)
    
    trackMetric('api.ai.analytics.error', 1, {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to generate analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Export individual analytics endpoints
export async function POST(request: NextRequest) {
  try {
    // Note: Rate limiting for analytics endpoint would need to be implemented
    // For now, we'll skip rate limiting for this endpoint
    
    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { meetingId, analysisType } = body
    
    if (!meetingId || !analysisType) {
      return NextResponse.json(
        { error: 'Meeting ID and analysis type are required' },
        { status: 400 }
      )
    }
    
    // Check if user has access to the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meetingId)
      .single()
    
    if (meetingError || !meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    // Verify user belongs to the organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', meeting.organization_id)
      .eq('user_id', user.id)
      .single()
    
    if (!member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    let result: any
    
    // Generate specific analysis based on type
    switch (analysisType) {
      case 'speaking_time':
        result = await meetingAnalyticsEngine.analyzeSpeakingTime(meeting)
        break
        
      case 'effectiveness':
        result = await meetingAnalyticsEngine.calculateEffectivenessScore(meeting)
        break
        
      case 'patterns':
        result = await meetingAnalyticsEngine.detectPatterns(meeting)
        break
        
      case 'energy':
        result = await meetingAnalyticsEngine.analyzeEnergyLevels(meeting)
        break
        
      case 'engagement':
        result = await meetingAnalyticsEngine.calculateEngagementScore(meeting)
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid analysis type' },
          { status: 400 }
        )
    }
    
    // Track API usage
    trackMetric('api.ai.analytics.partial', 1, {
      user_id: user.id,
      organization_id: meeting.organization_id,
      analysis_type: analysisType
    })
    
    return NextResponse.json({
      success: true,
      data: result,
      analysisType,
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    
    trackMetric('api.ai.analytics.error', 1, {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to generate analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}