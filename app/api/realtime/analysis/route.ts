import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLiveAnalysisEngine } from '@/lib/realtime/live-analysis'
import { getAnalyticsStore } from '@/lib/realtime/analytics-store'

export const runtime = 'nodejs'

// GET - Get current real-time analysis state
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const meetingId = request.nextUrl.searchParams.get('meetingId')
    const type = request.nextUrl.searchParams.get('type') || 'current'
    
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      )
    }
    
    // Verify user has access to the meeting
    const { data: meeting } = await supabase
      .from('meetings')
      .select('organization_id, status')
      .eq('id', meetingId)
      .single()
    
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.organization_id !== meeting.organization_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    const liveAnalysis = getLiveAnalysisEngine()
    const analyticsStore = getAnalyticsStore()
    
    switch (type) {
      case 'current':
        // Get current analysis snapshot
        const currentAnalysis = liveAnalysis.getCurrentAnalysis()
        
        if (!currentAnalysis) {
          return NextResponse.json({
            meetingId,
            status: 'no_data',
            message: 'No analysis data available yet'
          })
        }
        
        return NextResponse.json({
          meetingId,
          status: meeting.status,
          analysis: currentAnalysis,
          timestamp: Date.now()
        })
      
      case 'metrics':
        // Get analytics metrics
        const metrics = request.nextUrl.searchParams.get('metrics')?.split(',') || []
        const timeRange = request.nextUrl.searchParams.get('timeRange')
        
        const metricsData: Record<string, any> = {}
        
        for (const metric of metrics) {
          if (timeRange) {
            const [start, end] = timeRange.split('-').map(Number)
            metricsData[metric] = analyticsStore.getTimeSeries(
              meetingId,
              metric,
              { start, end }
            )
          } else {
            metricsData[metric] = analyticsStore.getTimeSeries(meetingId, metric)
          }
        }
        
        return NextResponse.json({
          meetingId,
          metrics: metricsData,
          timestamp: Date.now()
        })
      
      case 'summary':
        // Get meeting analytics summary
        const summary = analyticsStore.getMeetingSummary(meetingId)
        
        if (!summary) {
          return NextResponse.json({
            meetingId,
            status: 'no_data',
            message: 'No analytics data available'
          })
        }
        
        return NextResponse.json({
          meetingId,
          summary,
          timestamp: Date.now()
        })
      
      case 'export':
        // Export analytics data
        const format = request.nextUrl.searchParams.get('format') || 'json'
        const includeRaw = request.nextUrl.searchParams.get('includeRaw') === 'true'
        const includeAgg = request.nextUrl.searchParams.get('includeAggregations') === 'true'
        
        const exportData = await analyticsStore.exportAnalytics(meetingId, {
          type: format as 'json' | 'csv',
          includeRawData: includeRaw,
          includeAggregations: includeAgg
        })
        
        const contentType = format === 'csv' ? 'text/csv' : 'application/json'
        const filename = `meeting-analytics-${meetingId}-${Date.now()}.${format}`
        
        return new Response(exportData, {
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename="${filename}"`
          }
        })
      
      default:
        return NextResponse.json(
          { error: 'Invalid analysis type' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Get analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to get analysis' },
      { status: 500 }
    )
  }
}

// POST - Configure analysis settings
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { meetingId, action, config } = body
    
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      )
    }
    
    // Verify user has access
    const { data: meeting } = await supabase
      .from('meetings')
      .select('organization_id')
      .eq('id', meetingId)
      .single()
    
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.organization_id !== meeting.organization_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    const liveAnalysis = getLiveAnalysisEngine()
    const analyticsStore = getAnalyticsStore()
    
    switch (action) {
      case 'configure':
        // Configure analysis settings
        if (config.windowSize) {
          liveAnalysis.setWindowSize(config.windowSize)
        }
        
        if (config.updateInterval) {
          liveAnalysis.setUpdateInterval(config.updateInterval)
        }
        
        if (config.retentionDays) {
          analyticsStore.setRetentionPeriod(config.retentionDays)
        }
        
        return NextResponse.json({
          success: true,
          message: 'Analysis configured successfully'
        })
      
      case 'record':
        // Manually record metrics
        const { metrics, metadata } = body
        
        if (!metrics || typeof metrics !== 'object') {
          return NextResponse.json(
            { error: 'Metrics object required' },
            { status: 400 }
          )
        }
        
        analyticsStore.recordMetrics(meetingId, metrics, metadata)
        
        return NextResponse.json({
          success: true,
          message: 'Metrics recorded successfully'
        })
      
      case 'initialize':
        // Initialize analytics for meeting
        analyticsStore.initializeMeeting(meetingId)
        
        return NextResponse.json({
          success: true,
          message: 'Analytics initialized for meeting'
        })
      
      case 'end':
        // End meeting analytics
        analyticsStore.endMeeting(meetingId)
        
        return NextResponse.json({
          success: true,
          message: 'Meeting analytics finalized'
        })
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Configure analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to configure analysis' },
      { status: 500 }
    )
  }
}

// Server-Sent Events endpoint for real-time analysis updates
export async function SSE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const meetingId = request.nextUrl.searchParams.get('meetingId')
    
    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID required' },
        { status: 400 }
      )
    }
    
    // Verify access
    const { data: meeting } = await supabase
      .from('meetings')
      .select('organization_id')
      .eq('id', meetingId)
      .single()
    
    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      )
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile || profile.organization_id !== meeting.organization_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    const liveAnalysis = getLiveAnalysisEngine()
    const analyticsStore = getAnalyticsStore()
    
    // Create SSE stream
    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      start(controller) {
        // Send initial analysis
        const currentAnalysis = liveAnalysis.getCurrentAnalysis()
        if (currentAnalysis) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'analysis',
              data: currentAnalysis
            })}\n\n`)
          )
        }
        
        // Set up event listeners
        const onAnalysisUpdate = (analysis: any) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'analysis',
              data: analysis
            })}\n\n`)
          )
        }
        
        const onMetricRecorded = (event: any) => {
          if (event.meetingId === meetingId) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'metric',
                data: event
              })}\n\n`)
            )
          }
        }
        
        const onAlert = (alert: any) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'alert',
              data: alert
            })}\n\n`)
          )
        }
        
        const onAnomaly = (anomaly: any) => {
          if (anomaly.meetingId === meetingId) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'anomaly',
                data: anomaly
              })}\n\n`)
            )
          }
        }
        
        // Register listeners
        liveAnalysis.on('analysis:update', onAnalysisUpdate)
        liveAnalysis.on('alert:sentiment', onAlert)
        liveAnalysis.on('alert:engagement', onAlert)
        liveAnalysis.on('alert:dynamics', onAlert)
        liveAnalysis.on('alert:topic', onAlert)
        analyticsStore.on('metric:recorded', onMetricRecorded)
        analyticsStore.on('anomaly:detected', onAnomaly)
        
        // Send heartbeat every 30 seconds
        const heartbeat = setInterval(() => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: Date.now()
            })}\n\n`)
          )
        }, 30000)
        
        // Clean up on close
        request.signal.addEventListener('abort', () => {
          liveAnalysis.off('analysis:update', onAnalysisUpdate)
          liveAnalysis.off('alert:sentiment', onAlert)
          liveAnalysis.off('alert:engagement', onAlert)
          liveAnalysis.off('alert:dynamics', onAlert)
          liveAnalysis.off('alert:topic', onAlert)
          analyticsStore.off('metric:recorded', onMetricRecorded)
          analyticsStore.off('anomaly:detected', onAnomaly)
          clearInterval(heartbeat)
          controller.close()
        })
      }
    })
    
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })
  } catch (error) {
    console.error('SSE error:', error)
    return NextResponse.json(
      { error: 'Failed to establish SSE connection' },
      { status: 500 }
    )
  }
}

// Handle SSE requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}