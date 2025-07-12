import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

interface Alert {
  id: string
  type: 'usage_spike' | 'rate_limit' | 'error_rate' | 'system_resource' | 'payment_failed' | 'quota_exceeded'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  organizationId?: string
  organizationName?: string
  metadata: Record<string, any>
  createdAt: string
  acknowledged: boolean
  acknowledgedAt?: string
  acknowledgedBy?: string
  resolved: boolean
  resolvedAt?: string
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient()
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'active' // active, acknowledged, resolved, all
    const severity = searchParams.get('severity') // critical, high, medium, low
    const limit = parseInt(searchParams.get('limit') || '50')

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

    // For now, we'll generate sample alerts based on real data patterns
    // In production, this would query an actual monitoring_alerts table
    const alerts: Alert[] = []
    
    // Check for high usage organizations
    const { data: highUsageOrgs } = await supabase
      .from('mode_usage')
      .select(`
        organization_id,
        fast_minutes,
        balanced_minutes,
        precision_minutes,
        organization:organizations(name)
      `)
      .eq('month', new Date().toISOString().slice(0, 7) + '-01')
      .gt('fast_minutes', 1000) // High usage threshold
      .limit(5)

    highUsageOrgs?.forEach(org => {
      const totalMinutes = org.fast_minutes + org.balanced_minutes + org.precision_minutes
      if (totalMinutes > 2000) {
        alerts.push({
          id: `usage-${org.organization_id}`,
          type: 'usage_spike',
          severity: totalMinutes > 5000 ? 'critical' : 'high',
          title: 'High Usage Detected',
          description: `Organization has used ${totalMinutes.toLocaleString()} minutes this month`,
          organizationId: org.organization_id,
          organizationName: org.organization?.name,
          metadata: { totalMinutes },
          createdAt: new Date().toISOString(),
          acknowledged: false,
          resolved: false
        })
      }
    })

    // Check for failed payments
    const { data: failedPayments } = await supabase
      .from('payment_logs')
      .select(`
        organization_id,
        amount,
        error_message,
        organization:organizations(name)
      `)
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(10)

    failedPayments?.forEach(payment => {
      alerts.push({
        id: `payment-${payment.organization_id}-${Date.now()}`,
        type: 'payment_failed',
        severity: 'high',
        title: 'Payment Failed',
        description: payment.error_message || 'Payment processing failed',
        organizationId: payment.organization_id,
        organizationName: payment.organization?.name,
        metadata: { amount: payment.amount },
        createdAt: new Date().toISOString(),
        acknowledged: false,
        resolved: false
      })
    })

    // Filter alerts based on status
    let filteredAlerts = alerts
    if (status === 'active') {
      filteredAlerts = alerts.filter(a => !a.resolved && !a.acknowledged)
    } else if (status === 'acknowledged') {
      filteredAlerts = alerts.filter(a => a.acknowledged && !a.resolved)
    } else if (status === 'resolved') {
      filteredAlerts = alerts.filter(a => a.resolved)
    }

    if (severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === severity)
    }

    // Calculate statistics
    const stats = {
      active_count: alerts.filter(a => !a.resolved && !a.acknowledged).length,
      critical_count: alerts.filter(a => a.severity === 'critical' && !a.resolved).length,
      high_count: alerts.filter(a => a.severity === 'high' && !a.resolved).length,
      medium_count: alerts.filter(a => a.severity === 'medium' && !a.resolved).length,
      low_count: alerts.filter(a => a.severity === 'low' && !a.resolved).length,
      resolved_today: 0, // Would need tracking
      avg_resolution_time: 0 // Would need tracking
    }

    return NextResponse.json({
      alerts: filteredAlerts.slice(0, limit),
      statistics: {
        active: stats.active_count,
        critical: stats.critical_count,
        high: stats.high_count,
        medium: stats.medium_count,
        low: stats.low_count,
        resolvedToday: stats.resolved_today,
        averageResolutionTime: stats.avg_resolution_time
      }
    })
  } catch (error) {
    console.error('Alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient()
    const body = await req.json()
    const { alertId, action } = body // action: acknowledge, resolve

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

    // In a real implementation, this would update the monitoring_alerts table
    // For now, we'll just return success
    if (action !== 'acknowledge' && action !== 'resolve') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log the action for tracking
    console.log(`Alert ${alertId} ${action}d by user ${user.id}`)

    return NextResponse.json({
      success: true,
      message: `Alert ${action}d successfully`
    })
  } catch (error) {
    console.error('Alert action error:', error)
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    )
  }
}