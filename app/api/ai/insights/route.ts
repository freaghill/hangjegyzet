import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insightsEngine } from '@/lib/ai/insights-engine'
import { intelligentFollowUp } from '@/lib/ai/follow-up-automation'
import { trackMetric } from '@/lib/monitoring'
import { rateLimiter } from '@/lib/monitoring/rate-limiter'

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimitResult = await rateLimiter.consume(identifier, 'api.ai.insights')
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }
    
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
      .select('id, organization_id, meeting_type')
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
    
    // Generate business insights
    const startTime = Date.now()
    const insights = await insightsEngine.analyzeBusinessInsights(meetingId)
    
    // Track API usage
    trackMetric('api.ai.insights.success', 1, {
      user_id: user.id,
      organization_id: meeting.organization_id,
      meeting_type: meeting.meeting_type,
      processing_time: Date.now() - startTime
    })
    
    // Cache the results for 1 hour
    const headers = new Headers()
    headers.set('Cache-Control', 'private, max-age=3600')
    
    return NextResponse.json(
      {
        success: true,
        data: insights,
        generated_at: new Date().toISOString()
      },
      { headers }
    )
  } catch (error) {
    console.error('Insights API error:', error)
    
    trackMetric('api.ai.insights.error', 1, {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to generate insights',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Generate follow-up plan
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimitResult = await rateLimiter.consume(identifier, 'api.ai.insights')
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }
    
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
    const { meetingId, action } = body
    
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
    
    let result: any
    
    // Handle different actions
    switch (action) {
      case 'generate_follow_up':
        result = await intelligentFollowUp.generateFollowUpPlan(meetingId)
        break
        
      case 'update_action_progress':
        const { itemId, update } = body
        if (!itemId || !update) {
          return NextResponse.json(
            { error: 'Item ID and update data are required' },
            { status: 400 }
          )
        }
        result = await intelligentFollowUp.updateActionProgress(itemId, update)
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
    
    // Track API usage
    trackMetric('api.ai.insights.action', 1, {
      user_id: user.id,
      organization_id: meeting.organization_id,
      action
    })
    
    return NextResponse.json({
      success: true,
      data: result,
      action,
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Insights action API error:', error)
    
    trackMetric('api.ai.insights.action_error', 1, {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to execute action',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Get specific insight type
export async function PUT(request: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = request.headers.get('x-forwarded-for') || 'anonymous'
    const rateLimitResult = await rateLimiter.consume(identifier, 'api.ai.insights')
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimitResult.retryAfter },
        { status: 429 }
      )
    }
    
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
    const { meetingId, insightType } = body
    
    if (!meetingId || !insightType) {
      return NextResponse.json(
        { error: 'Meeting ID and insight type are required' },
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
    
    // Generate specific insight based on type
    switch (insightType) {
      case 'deal_probability':
        result = await insightsEngine.calculateDealProbability(meeting)
        break
        
      case 'compliance':
        result = await insightsEngine.detectComplianceIssues(meeting)
        break
        
      case 'market':
        result = await insightsEngine.extractMarketInsights(meeting)
        break
        
      case 'budget':
        result = await insightsEngine.analyzeBudgetImpact(meeting)
        break
        
      case 'risks':
        result = await insightsEngine.identifyRisks(meeting)
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid insight type' },
          { status: 400 }
        )
    }
    
    // Track API usage
    trackMetric('api.ai.insights.partial', 1, {
      user_id: user.id,
      organization_id: meeting.organization_id,
      insight_type: insightType
    })
    
    return NextResponse.json({
      success: true,
      data: result,
      insightType,
      generated_at: new Date().toISOString()
    })
  } catch (error) {
    console.error('Insights API error:', error)
    
    trackMetric('api.ai.insights.error', 1, {
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    
    return NextResponse.json(
      { 
        error: 'Failed to generate insight',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}