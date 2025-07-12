import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    const organizationId = profile.organization_id
    
    // Get current month stats
    const now = new Date()
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    
    // Get total meetings count
    const { count: totalMeetings } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
    
    // Get meetings this month
    const { count: meetingsThisMonth } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .gte('created_at', currentMonthStart)
    
    // Get total transcription minutes
    const { data: totalMinutesData } = await supabase
      .from('meetings')
      .select('duration_seconds')
      .eq('organization_id', organizationId)
      .not('duration_seconds', 'is', null)
    
    const totalMinutes = Math.round(
      (totalMinutesData?.reduce((sum, m) => sum + (m.duration_seconds || 0), 0) || 0) / 60
    )
    
    // Get average meeting duration
    const avgDurationSeconds = totalMinutesData && totalMinutesData.length > 0
      ? totalMinutesData.reduce((sum, m) => sum + (m.duration_seconds || 0), 0) / totalMinutesData.length
      : 0
    const avgDuration = Math.round(avgDurationSeconds / 60)
    
    // Get meeting status distribution
    const { data: statusData } = await supabase
      .from('meetings')
      .select('status')
      .eq('organization_id', organizationId)
    
    const statusDistribution = statusData?.reduce((acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { data: recentActivity } = await supabase
      .from('meetings')
      .select('created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })
    
    // Group by day
    const activityByDay = recentActivity?.reduce((acc, m) => {
      const date = new Date(m.created_at).toLocaleDateString('hu-HU')
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}
    
    // Get top speakers
    const { data: meetingsWithSpeakers } = await supabase
      .from('meetings')
      .select('speakers')
      .eq('organization_id', organizationId)
      .not('speakers', 'is', null)
      .limit(100)
    
    const speakerCounts: Record<string, number> = {}
    meetingsWithSpeakers?.forEach(m => {
      if (Array.isArray(m.speakers)) {
        m.speakers.forEach((speaker: { name?: string; [key: string]: unknown }) => {
          if (speaker.name) {
            speakerCounts[speaker.name] = (speakerCounts[speaker.name] || 0) + 1
          }
        })
      }
    })
    
    const topSpeakers = Object.entries(speakerCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }))
    
    return NextResponse.json({
      totalMeetings: totalMeetings || 0,
      meetingsThisMonth: meetingsThisMonth || 0,
      totalMinutes,
      avgDuration,
      statusDistribution,
      activityByDay,
      topSpeakers,
      lastUpdated: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}