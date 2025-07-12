import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

interface UsageMetrics {
  overview: {
    totalTranscriptions: number
    activeOrganizations: number
    totalMinutesTranscribed: number
    averageDuration: number
    monthlyActiveUsers: number
  }
  revenue: {
    mrr: number
    arr: number
    averageRevenuePerUser: number
    churnRate: number
  }
  modeDistribution: {
    fast: number
    balanced: number
    precision: number
  }
  topOrganizations: Array<{
    id: string
    name: string
    usage: number
    subscription_tier: string
  }>
  growth: {
    transcriptionsGrowth: number
    userGrowth: number
    revenueGrowth: number
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7) + '-01'

    // Get total transcriptions
    const { count: totalTranscriptions } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })

    // Get active organizations
    const { count: activeOrganizations } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    // Get total minutes and average duration
    const { data: durationStats } = await supabase
      .from('meetings')
      .select('duration')
      .not('duration', 'is', null)

    const totalMinutes = durationStats?.reduce((sum, m) => sum + (m.duration || 0), 0) || 0
    const averageDuration = durationStats?.length ? totalMinutes / durationStats.length : 0

    // Get monthly active users
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: monthlyActiveUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_active_at', thirtyDaysAgo.toISOString())

    // Get mode distribution for current month
    const { data: modeUsage } = await supabase
      .from('mode_usage')
      .select('fast_minutes, balanced_minutes, precision_minutes')
      .eq('month', currentMonth)

    const modeDistribution = modeUsage?.reduce((acc, usage) => ({
      fast: acc.fast + usage.fast_minutes,
      balanced: acc.balanced + usage.balanced_minutes,
      precision: acc.precision + usage.precision_minutes
    }), { fast: 0, balanced: 0, precision: 0 }) || { fast: 0, balanced: 0, precision: 0 }

    // Get revenue metrics
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('price_amount, status')
      .eq('status', 'active')

    const mrr = subscriptions?.reduce((sum, sub) => sum + (sub.price_amount || 0), 0) || 0
    const arr = mrr * 12
    const arpu = activeOrganizations ? mrr / activeOrganizations : 0

    // Calculate churn rate (simplified - organizations that cancelled this month)
    const { count: churnedOrgs } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte('cancelled_at', currentMonth)

    const churnRate = activeOrganizations ? (churnedOrgs || 0) / activeOrganizations * 100 : 0

    // Get top organizations by usage
    const { data: topOrgs } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        subscription_tier,
        mode_usage!inner(
          fast_minutes,
          balanced_minutes,
          precision_minutes
        )
      `)
      .eq('mode_usage.month', currentMonth)
      .order('mode_usage.fast_minutes', { ascending: false })
      .limit(10)

    const topOrganizations = topOrgs?.map(org => ({
      id: org.id,
      name: org.name,
      usage: (org.mode_usage[0]?.fast_minutes || 0) + 
             (org.mode_usage[0]?.balanced_minutes || 0) + 
             (org.mode_usage[0]?.precision_minutes || 0),
      subscription_tier: org.subscription_tier
    })) || []

    // Calculate growth metrics (current month vs last month)
    const { count: lastMonthTranscriptions } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', lastMonth)
      .lt('created_at', currentMonth)

    const { count: currentMonthTranscriptions } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', currentMonth)

    const transcriptionsGrowth = lastMonthTranscriptions 
      ? ((currentMonthTranscriptions || 0) - lastMonthTranscriptions) / lastMonthTranscriptions * 100 
      : 0

    // User growth
    const { count: lastMonthUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', currentMonth)

    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const userGrowth = lastMonthUsers 
      ? ((totalUsers || 0) - lastMonthUsers) / lastMonthUsers * 100 
      : 0

    // Revenue growth (simplified - compare MRR)
    const { data: lastMonthSubs } = await supabase
      .from('subscriptions')
      .select('price_amount')
      .eq('status', 'active')
      .lt('created_at', currentMonth)

    const lastMonthMRR = lastMonthSubs?.reduce((sum, sub) => sum + (sub.price_amount || 0), 0) || 0
    const revenueGrowth = lastMonthMRR ? (mrr - lastMonthMRR) / lastMonthMRR * 100 : 0

    const metrics: UsageMetrics = {
      overview: {
        totalTranscriptions: totalTranscriptions || 0,
        activeOrganizations: activeOrganizations || 0,
        totalMinutesTranscribed: Math.round(totalMinutes),
        averageDuration: Math.round(averageDuration),
        monthlyActiveUsers: monthlyActiveUsers || 0
      },
      revenue: {
        mrr,
        arr,
        averageRevenuePerUser: Math.round(arpu * 100) / 100,
        churnRate: Math.round(churnRate * 100) / 100
      },
      modeDistribution,
      topOrganizations,
      growth: {
        transcriptionsGrowth: Math.round(transcriptionsGrowth * 100) / 100,
        userGrowth: Math.round(userGrowth * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100
      }
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Usage metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage metrics' },
      { status: 500 }
    )
  }
}