import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { predictiveMeetingEngine } from '@/lib/ai/predictive-intelligence'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const participants = searchParams.get('participants')?.split(',') || []
    const meetingType = searchParams.get('type') || undefined
    const includeTopics = searchParams.get('includeTopics') !== 'false'
    const includeDuration = searchParams.get('includeDuration') !== 'false'
    const includeCosts = searchParams.get('includeCosts') !== 'false'
    const includeInsights = searchParams.get('includeInsights') !== 'false'
    
    const response: any = {}
    
    // Get predictions based on requested data
    const promises = []
    
    if (includeTopics) {
      promises.push(
        predictiveMeetingEngine.predictMeetingTopics(
          profile.organization_id,
          participants,
          meetingType
        ).then(topics => { response.predictedTopics = topics })
      )
    }
    
    if (includeDuration) {
      promises.push(
        predictiveMeetingEngine.estimateDuration(
          profile.organization_id,
          meetingType || 'custom',
          participants.length
        ).then(duration => { response.estimatedDuration = duration })
      )
    }
    
    if (includeCosts && participants.length > 0) {
      // For costs, we need to get participant data with hourly rates
      promises.push(
        supabase
          .from('profiles')
          .select('id, name, settings')
          .in('id', participants)
          .then(({ data: participantProfiles }) => {
            const participantData = participants.map(email => ({
              email,
              hourlyRate: participantProfiles?.find(p => p.id === email)?.settings?.hourlyRate
            }))
            
            return predictiveMeetingEngine.calculateCosts(
              profile.organization_id,
              participantData,
              response.estimatedDuration || 60
            )
          })
          .then(costs => { response.estimatedCosts = costs })
      )
    }
    
    if (includeInsights) {
      promises.push(
        predictiveMeetingEngine.generateInsights(
          profile.organization_id,
          participants,
          meetingType
        ).then(insights => { response.insights = insights })
      )
    }
    
    // Wait for all predictions to complete
    await Promise.all(promises)
    
    // Add participant analysis if requested
    if (participants.length > 0 && searchParams.get('includeParticipants') === 'true') {
      const participantAnalyses = await Promise.all(
        participants.map(p => 
          predictiveMeetingEngine.analyzeParticipant(profile.organization_id, p)
        )
      )
      response.participants = participantAnalyses
    }
    
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error generating predictions:', error)
    return NextResponse.json(
      { error: 'Failed to generate predictions' },
      { status: 500 }
    )
  }
}