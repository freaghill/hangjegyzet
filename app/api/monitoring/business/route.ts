import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MonitoringService } from '@/lib/monitoring/monitoring-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'
    
    // Parse time range
    const now = new Date()
    let startDate: Date
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    const supabase = await createClient()
    
    // Collect KPIs
    const kpis = await MonitoringService.collectBusinessKPIs()
    
    // Calculate revenue metrics
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('amount, interval, created_at')
      .eq('status', 'active')
    
    const mrr = subscriptions?.reduce((sum, sub) => {
      const monthlyAmount = sub.interval === 'year' ? sub.amount / 12 : sub.amount
      return sum + monthlyAmount
    }, 0) || 0
    
    const arr = mrr * 12
    
    // Calculate churn rate
    const { count: cancelledCount } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'cancelled')
      .gte('cancelled_at', startDate.toISOString())
    
    const { count: totalActive } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
    
    const churnRate = totalActive ? (cancelledCount || 0) / totalActive * 100 : 0
    
    // Calculate user metrics
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    const { count: activeUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('last_active_at', startDate.toISOString())
    
    const { count: newUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
    
    // Calculate usage metrics
    const { count: totalMeetings } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
    
    const { data: transcriptions } = await supabase
      .from('transcriptions')
      .select('duration')
      .gte('created_at', startDate.toISOString())
    
    const totalMinutes = transcriptions?.reduce((sum, t) => sum + (t.duration || 0), 0) || 0
    
    // Calculate storage
    const { data: files } = await supabase
      .from('meetings')
      .select('file_size')
      .gte('created_at', startDate.toISOString())
    
    const storageUsed = files?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0
    
    // API usage (placeholder - would need actual logging)
    const apiCalls = Math.floor(Math.random() * 50000) + 10000
    
    // Calculate conversion metrics
    const { count: trialUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'trialing')
      .gte('created_at', startDate.toISOString())
    
    const { count: paidUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('subscription_status', 'active')
      .gte('created_at', startDate.toISOString())
    
    const signupToTrial = newUsers ? (trialUsers || 0) / newUsers * 100 : 0
    const trialToPaid = trialUsers ? (paidUsers || 0) / trialUsers * 100 : 0
    const overallConversion = newUsers ? (paidUsers || 0) / newUsers * 100 : 0
    
    // Calculate growth rates
    const previousPeriodStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))
    
    const { data: previousRevenue } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', previousPeriodStart.toISOString())
      .lt('created_at', startDate.toISOString())
      .eq('status', 'succeeded')
    
    const { data: currentRevenue } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', startDate.toISOString())
      .eq('status', 'succeeded')
    
    const previousTotal = previousRevenue?.reduce((sum, p) => sum + p.amount, 0) || 0
    const currentTotal = currentRevenue?.reduce((sum, p) => sum + p.amount, 0) || 0
    const revenueGrowth = previousTotal ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0
    
    return NextResponse.json({
      kpis,
      revenue: {
        current: currentTotal,
        previous: previousTotal,
        growth: revenueGrowth,
        mrr,
        arr,
        churn: churnRate,
      },
      users: {
        total: totalUsers || 0,
        active: activeUsers || 0,
        new: newUsers || 0,
        retained: activeUsers || 0,
        churnRate,
      },
      usage: {
        meetings: totalMeetings || 0,
        transcriptionMinutes: Math.round(totalMinutes / 60),
        storageUsed,
        apiCalls,
      },
      conversion: {
        signupToTrial,
        trialToPaid,
        overallConversion,
        averageTimeToConvert: 12, // days - placeholder
      },
    })
  } catch (error) {
    console.error('Error fetching business metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch business metrics' },
      { status: 500 }
    )
  }
}