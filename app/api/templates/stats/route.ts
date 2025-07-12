import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { templateManager } from '@/lib/templates/meeting-templates'

// GET /api/templates/stats - Get template usage statistics
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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get query parameters for date range
    const { searchParams } = new URL(request.url)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    
    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined

    // Get template usage statistics
    const stats = await templateManager.getTemplateUsageStats(
      profile.organization_id,
      startDate,
      endDate
    )

    // Get overall meeting statistics
    let query = supabase
      .from('meetings')
      .select('template_id, intelligence_score')
      .eq('organization_id', profile.organization_id)
      .eq('status', 'completed')

    if (startDate) {
      query = query.gte('created_at', startDate.toISOString())
    }
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data: meetings, error } = await query

    if (error) {
      console.error('Error fetching meeting stats:', error)
      return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
    }

    // Calculate overall statistics
    const totalMeetings = meetings?.length || 0
    const meetingsWithTemplate = meetings?.filter(m => m.template_id).length || 0
    const meetingsWithoutTemplate = totalMeetings - meetingsWithTemplate
    
    const avgScoreWithTemplate = meetingsWithTemplate > 0
      ? meetings
          .filter(m => m.template_id && m.intelligence_score)
          .reduce((sum, m) => sum + m.intelligence_score!, 0) / meetingsWithTemplate
      : 0
    
    const avgScoreWithoutTemplate = meetingsWithoutTemplate > 0
      ? meetings
          .filter(m => !m.template_id && m.intelligence_score)
          .reduce((sum, m) => sum + m.intelligence_score!, 0) / meetingsWithoutTemplate
      : 0

    return NextResponse.json({
      templateStats: stats,
      overallStats: {
        totalMeetings,
        meetingsWithTemplate,
        meetingsWithoutTemplate,
        templateUsageRate: totalMeetings > 0 ? (meetingsWithTemplate / totalMeetings) * 100 : 0,
        avgScoreWithTemplate: Math.round(avgScoreWithTemplate),
        avgScoreWithoutTemplate: Math.round(avgScoreWithoutTemplate),
        scoreImprovement: avgScoreWithTemplate - avgScoreWithoutTemplate
      }
    })
  } catch (error) {
    console.error('Error fetching template stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}