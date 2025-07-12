import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'usage' // usage, alerts, performance, organizations
    const format = searchParams.get('format') || 'csv' // csv, json
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

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

    let data: any[] = []
    let filename = ''

    switch (type) {
      case 'usage':
        // Export usage data
        const { data: usageData } = await supabase
          .from('mode_usage')
          .select(`
            *,
            organization:organizations(
              id,
              name,
              subscription_tier
            )
          `)
          .gte('month', startDate || '2024-01-01')
          .lte('month', endDate || new Date().toISOString())
          .order('month', { ascending: false })

        data = usageData?.map(usage => ({
          organization_id: usage.organization_id,
          organization_name: usage.organization?.name,
          subscription_tier: usage.organization?.subscription_tier,
          month: usage.month,
          fast_minutes: usage.fast_minutes,
          balanced_minutes: usage.balanced_minutes,
          precision_minutes: usage.precision_minutes,
          total_minutes: usage.fast_minutes + usage.balanced_minutes + usage.precision_minutes
        })) || []
        
        filename = `usage_export_${new Date().toISOString().slice(0, 10)}`
        break

      case 'alerts':
        // Export alerts data
        const { data: alertsData } = await supabase
          .from('monitoring_alerts')
          .select(`
            *,
            organization:organizations(
              id,
              name
            )
          `)
          .gte('created_at', startDate || '2024-01-01')
          .lte('created_at', endDate || new Date().toISOString())
          .order('created_at', { ascending: false })

        data = alertsData?.map(alert => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          organization_name: alert.organization?.name,
          created_at: alert.created_at,
          acknowledged: alert.acknowledged,
          resolved: alert.resolved,
          resolution_time: alert.resolved_at ? 
            (new Date(alert.resolved_at).getTime() - new Date(alert.created_at).getTime()) / 1000 / 60 : null
        })) || []
        
        filename = `alerts_export_${new Date().toISOString().slice(0, 10)}`
        break

      case 'performance':
        // Export performance metrics
        const { data: perfData } = await supabase
          .from('api_metrics')
          .select('*')
          .gte('timestamp', startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .lte('timestamp', endDate || new Date().toISOString())
          .order('timestamp', { ascending: false })

        data = perfData?.map(metric => ({
          timestamp: metric.timestamp,
          endpoint: metric.endpoint,
          method: metric.method,
          status_code: metric.status_code,
          response_time: metric.response_time,
          user_id: metric.user_id,
          organization_id: metric.organization_id
        })) || []
        
        filename = `performance_export_${new Date().toISOString().slice(0, 10)}`
        break

      case 'organizations':
        // Export organizations data
        const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
        
        const { data: orgsData } = await supabase
          .from('organizations')
          .select(`
            *,
            subscriptions!inner(
              status,
              price_amount,
              current_period_start,
              current_period_end
            ),
            mode_usage!left(
              fast_minutes,
              balanced_minutes,
              precision_minutes
            )
          `)
          .eq('mode_usage.month', currentMonth)

        data = orgsData?.map(org => ({
          id: org.id,
          name: org.name,
          created_at: org.created_at,
          subscription_tier: org.subscription_tier,
          subscription_status: org.subscriptions[0]?.status,
          monthly_price: org.subscriptions[0]?.price_amount,
          current_month_fast: org.mode_usage[0]?.fast_minutes || 0,
          current_month_balanced: org.mode_usage[0]?.balanced_minutes || 0,
          current_month_precision: org.mode_usage[0]?.precision_minutes || 0,
          current_month_total: 
            (org.mode_usage[0]?.fast_minutes || 0) + 
            (org.mode_usage[0]?.balanced_minutes || 0) + 
            (org.mode_usage[0]?.precision_minutes || 0),
          is_active: org.is_active
        })) || []
        
        filename = `organizations_export_${new Date().toISOString().slice(0, 10)}`
        break

      default:
        return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    // Format response based on requested format
    if (format === 'csv') {
      // Convert to CSV
      if (data.length === 0) {
        return new NextResponse('No data to export', { status: 204 })
      }

      const headers = Object.keys(data[0])
      const csvRows = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header]
            // Escape values that contain commas or quotes
            if (value === null || value === undefined) return ''
            const strValue = String(value)
            if (strValue.includes(',') || strValue.includes('"')) {
              return `"${strValue.replace(/"/g, '""')}"`
            }
            return strValue
          }).join(',')
        )
      ]
      
      const csv = csvRows.join('\n')
      
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}.csv"`
        }
      })
    } else {
      // Return as JSON
      return NextResponse.json({
        filename: `${filename}.json`,
        count: data.length,
        data
      })
    }
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}