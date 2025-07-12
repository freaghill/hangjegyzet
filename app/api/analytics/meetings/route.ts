import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { meetingAnalytics } from '@/lib/analytics/meeting-analytics'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const organizationId = searchParams.get('organizationId')
    const timeRange = searchParams.get('timeRange') as 'week' | 'month' | 'quarter' | 'year' || 'month'
    
    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 })
    }
    
    // Check user has access to organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()
    
    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Get analytics data
    const analytics = await meetingAnalytics.getAnalytics(organizationId, timeRange)
    
    // Cache the response for 5 minutes
    return NextResponse.json(analytics, {
      headers: {
        'Cache-Control': 'private, max-age=300'
      }
    })
    
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}