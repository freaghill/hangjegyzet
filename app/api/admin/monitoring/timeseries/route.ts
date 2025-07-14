import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

interface TimeSeriesData {
  usageTrends: Array<{
    date: string
    fast: number
    balanced: number
    precision: number
    total: number
  }>
  performanceMetrics: Array<{
    timestamp: string
    avgResponseTime: number
    errorRate: number
    successRate: number
  }>
  organizationGrowth: Array<{
    date: string
    activeOrgs: number
    newOrgs: number
    churnedOrgs: number
  }>
  revenueMetrics: Array<{
    month: string
    mrr: number
    newMRR: number
    churnedMRR: number
    expansionMRR: number
  }>
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient()
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const interval = searchParams.get('interval') || 'daily' // daily, weekly, monthly

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

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get usage trends by aggregating meetings data
    const { data: meetings } = await supabase
      .from('meetings')
      .select('created_at, duration, transcription_mode')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .not('duration', 'is', null)

    // Aggregate by day
    const usageByDay = new Map<string, { fast: number, balanced: number, precision: number }>()
    
    meetings?.forEach(meeting => {
      const date = meeting.created_at.split('T')[0]
      const existing = usageByDay.get(date) || { fast: 0, balanced: 0, precision: 0 }
      
      const minutes = Math.round(meeting.duration / 60)
      switch (meeting.transcription_mode) {
        case 'fast':
          existing.fast += minutes
          break
        case 'balanced':
          existing.balanced += minutes
          break
        case 'precision':
          existing.precision += minutes
          break
      }
      
      usageByDay.set(date, existing)
    })

    const usageTrends = Array.from(usageByDay.entries())
      .map(([date, usage]) => ({
        date,
        fast: usage.fast,
        balanced: usage.balanced,
        precision: usage.precision,
        total: usage.fast + usage.balanced + usage.precision
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Get performance metrics (last 24 hours, hourly)
    const perfEndDate = new Date()
    const perfStartDate = new Date()
    perfStartDate.setHours(perfStartDate.getHours() - 24)

    const { data: perfData } = await supabase
      .from('api_metrics')
      .select('timestamp, response_time, status_code')
      .gte('timestamp', perfStartDate.toISOString())
      .lte('timestamp', perfEndDate.toISOString())
      .order('timestamp')

    // Aggregate performance data by hour
    const performanceByHour = new Map<string, { total: number, errors: number, responseTime: number, count: number }>()
    
    perfData?.forEach(metric => {
      const hour = new Date(metric.timestamp).toISOString().slice(0, 13) + ':00:00'
      const existing = performanceByHour.get(hour) || { total: 0, errors: 0, responseTime: 0, count: 0 }
      
      existing.total++
      existing.responseTime += metric.response_time
      existing.count++
      if (metric.status_code >= 400) {
        existing.errors++
      }
      
      performanceByHour.set(hour, existing)
    })

    const performanceMetrics = Array.from(performanceByHour.entries()).map(([timestamp, data]) => ({
      timestamp,
      avgResponseTime: data.count > 0 ? Math.round(data.responseTime / data.count) : 0,
      errorRate: data.total > 0 ? (data.errors / data.total) * 100 : 0,
      successRate: data.total > 0 ? ((data.total - data.errors) / data.total) * 100 : 0
    }))

    // Get organization growth (simplified)
    const { data: organizations } = await supabase
      .from('organizations')
      .select('created_at, is_active')
      .gte('created_at', startDate.toISOString())
      .order('created_at')

    // Aggregate organization data by day
    const orgByDay = new Map<string, { new: number, total: number }>()
    let cumulativeTotal = 0
    
    organizations?.forEach(org => {
      const date = org.created_at.split('T')[0]
      const existing = orgByDay.get(date) || { new: 0, total: cumulativeTotal }
      existing.new++
      cumulativeTotal++
      existing.total = cumulativeTotal
      orgByDay.set(date, existing)
    })

    // Fill in missing days and calculate active orgs
    const organizationGrowth: any[] = []
    const currentDate = new Date(startDate)
    let lastTotal = 0
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const dayData = orgByDay.get(dateStr)
      
      organizationGrowth.push({
        date: dateStr,
        activeOrgs: dayData?.total || lastTotal,
        newOrgs: dayData?.new || 0,
        churnedOrgs: 0 // Simplified - would need subscription history for accuracy
      })
      
      if (dayData) lastTotal = dayData.total
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Get revenue metrics (simplified - last 12 months)
    const revenueEndDate = new Date()
    const revenueStartDate = new Date()
    revenueStartDate.setMonth(revenueStartDate.getMonth() - 12)

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('created_at, price_amount, status, cancelled_at')
      .gte('created_at', revenueStartDate.toISOString())

    // Aggregate revenue by month
    const revenueByMonth = new Map<string, { total: number, new: number, churned: number }>()
    
    subscriptions?.forEach(sub => {
      const month = sub.created_at.slice(0, 7)
      const existing = revenueByMonth.get(month) || { total: 0, new: 0, churned: 0 }
      
      if (sub.status === 'active') {
        existing.total += sub.price_amount || 0
        existing.new += sub.price_amount || 0
      } else if (sub.status === 'cancelled' && sub.cancelled_at) {
        const cancelMonth = sub.cancelled_at.slice(0, 7)
        const cancelData = revenueByMonth.get(cancelMonth) || { total: 0, new: 0, churned: 0 }
        cancelData.churned += sub.price_amount || 0
        revenueByMonth.set(cancelMonth, cancelData)
      }
      
      revenueByMonth.set(month, existing)
    })

    const revenueMetrics = Array.from(revenueByMonth.entries())
      .map(([month, data]) => ({
        month,
        mrr: data.total,
        newMRR: data.new,
        churnedMRR: data.churned,
        expansionMRR: 0 // Simplified - would need upgrade tracking
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const timeSeriesData: TimeSeriesData = {
      usageTrends,
      performanceMetrics,
      organizationGrowth,
      revenueMetrics
    }

    return NextResponse.json(timeSeriesData)
  } catch (error) {
    console.error('Time series data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch time series data' },
      { status: 500 }
    )
  }
}