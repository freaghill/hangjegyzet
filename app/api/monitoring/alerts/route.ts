import { NextRequest, NextResponse } from 'next/server'
import { AlertManager } from '@/lib/monitoring/alerts'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24')
    const type = searchParams.get('type') as any
    const severity = searchParams.get('severity') as any
    const active = searchParams.get('active') === 'true'
    
    if (active) {
      // Get only active alerts
      const activeAlerts = AlertManager.getActiveAlerts()
      return NextResponse.json({
        alerts: activeAlerts,
        count: activeAlerts.length,
      })
    } else {
      // Get alert history
      const alerts = await AlertManager.getAlertHistory(hours, type, severity)
      return NextResponse.json({
        alerts,
        count: alerts.length,
        timeRange: `${hours} hours`,
      })
    }
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId, action } = body
    
    if (action === 'resolve' && alertId) {
      await AlertManager.resolveAlert(alertId)
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json(
      { error: 'Invalid action or missing alertId' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error processing alert action:', error)
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    )
  }
}