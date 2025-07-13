import { NextRequest, NextResponse } from 'next/server'
import { UptimeMonitor } from '@/lib/monitoring/uptime'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24')
    
    // Get uptime statistics
    const stats = UptimeMonitor.getAllUptimeStats(hours)
    
    // Calculate overall uptime
    const services = Object.keys(stats)
    const totalUptime = services.reduce((sum, service) => sum + stats[service].uptime, 0)
    const overallUptime = services.length > 0 ? totalUptime / services.length : 0
    
    return NextResponse.json({
      overall: {
        uptime: overallUptime,
        services: services.length,
        timeRange: `${hours} hours`,
      },
      services: stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching uptime stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch uptime statistics' },
      { status: 500 }
    )
  }
}