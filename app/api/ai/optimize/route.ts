import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { meetingOptimizer } from '@/lib/ai/meeting-optimizer'
import { meetingHealthAnalyzer } from '@/lib/ai/meeting-health'
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
    const organizationId = searchParams.get('organizationId')
    const optimizationType = searchParams.get('type')
    
    if (!organizationId || !optimizationType) {
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
    
    switch (optimizationType) {
      case 'participants':
        const topic = searchParams.get('topic')
        const requiredParticipants = searchParams.get('required')?.split(',') || []
        
        if (!topic) {
          return NextResponse.json(
            { error: 'Topic is required for participant optimization' },
            { status: 400 }
          )
        }
        
        result = await meetingOptimizer.suggestOptimalParticipants(
          topic,
          organizationId,
          requiredParticipants
        )
        break
        
      case 'timeslots':
        const duration = parseInt(searchParams.get('duration') || '60')
        const participants = searchParams.get('participants')?.split(',') || []
        const startDate = searchParams.get('startDate') || new Date().toISOString()
        const endDate = searchParams.get('endDate') || 
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        
        result = await meetingOptimizer.findBestTimeSlots(
          organizationId,
          duration,
          participants,
          {
            start: new Date(startDate),
            end: new Date(endDate)
          }
        )
        break
        
      case 'roi':
        // This would typically be a POST, but for demo we'll parse from params
        const meetingData = {
          participants: searchParams.get('participants')?.split(',').map(p => ({
            userId: p,
            role: 'member'
          })) || [],
          duration: parseInt(searchParams.get('duration') || '60'),
          agenda: searchParams.get('agenda')?.split('|') || [],
          expectedOutcomes: searchParams.get('outcomes')?.split('|') || []
        }
        
        result = await meetingOptimizer.calculateMeetingROI(
          meetingData,
          organizationId
        )
        break
        
      case 'health':
        result = await meetingHealthAnalyzer.calculateHealthScore(organizationId)
        break
        
      case 'culture':
        result = await meetingHealthAnalyzer.analyzeMeetingCulture(organizationId)
        break
        
      case 'overload':
        result = await meetingHealthAnalyzer.detectMeetingOverload(organizationId)
        break
        
      case 'freetime':
        result = await meetingHealthAnalyzer.recommendMeetingFreeTime(organizationId)
        break
        
      case 'collaboration':
        result = await meetingHealthAnalyzer.analyzeTeamCollaboration(organizationId)
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid optimization type' },
          { status: 400 }
        )
    }
    
    trackMetric('api.meeting_optimization_retrieved', 1, {
      organization_id: organizationId,
      optimization_type: optimizationType
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in meeting optimization:', error)
    trackMetric('api.meeting_optimization_error', 1)
    
    return NextResponse.json(
      { error: 'Failed to optimize meeting' },
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
    const { organizationId, optimizationType, data } = body
    
    if (!organizationId || !optimizationType || !data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Verify user has access
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
    
    switch (optimizationType) {
      case 'predict':
        result = await meetingOptimizer.predictMeetingQuality(
          data.meeting,
          organizationId
        )
        break
        
      case 'structure':
        result = await meetingOptimizer.suggestMeetingStructure(
          data.topic,
          data.participants,
          data.objectives,
          data.constraints
        )
        break
        
      case 'roi':
        result = await meetingOptimizer.calculateMeetingROI(
          data.meeting,
          organizationId
        )
        break
        
      case 'apply-recommendation':
        // Apply a specific recommendation
        const { recommendationType, parameters } = data
        
        switch (recommendationType) {
          case 'no-meeting-day':
            // Store no-meeting day preference
            await supabase
              .from('organization_preferences')
              .upsert({
                organization_id: organizationId,
                preference_type: 'no_meeting_day',
                value: parameters.day,
                updated_by: user.id
              })
            
            result = { success: true, message: 'No-meeting day set successfully' }
            break
            
          case 'meeting-windows':
            // Store meeting window preferences
            await supabase
              .from('organization_preferences')
              .upsert({
                organization_id: organizationId,
                preference_type: 'meeting_windows',
                value: parameters.windows,
                updated_by: user.id
              })
            
            result = { success: true, message: 'Meeting windows configured' }
            break
            
          default:
            return NextResponse.json(
              { error: 'Invalid recommendation type' },
              { status: 400 }
            )
        }
        break
        
      default:
        return NextResponse.json(
          { error: 'Invalid optimization type' },
          { status: 400 }
        )
    }
    
    // Store optimization results for analytics
    const { error: storeError } = await supabase
      .from('optimization_results')
      .insert({
        organization_id: organizationId,
        optimization_type: optimizationType,
        input_data: data,
        results: result,
        created_by: user.id
      })
    
    if (storeError) {
      console.error('Error storing optimization results:', storeError)
    }
    
    trackMetric('api.meeting_optimization_created', 1, {
      organization_id: organizationId,
      optimization_type: optimizationType
    })
    
    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error in meeting optimization:', error)
    trackMetric('api.meeting_optimization_create_error', 1)
    
    return NextResponse.json(
      { error: 'Failed to optimize meeting' },
      { status: 500 }
    )
  }
}