import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLiveCoach } from '@/lib/realtime/live-coach'

export async function GET(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const meetingId = searchParams.get('meetingId')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
    }

    // Verify user has access to the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, organization_id')
      .eq('id', meetingId)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id !== meeting.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get coaching data from the live coach
    const liveCoach = getLiveCoach()
    const recentTips = liveCoach.getRecentTips(limit)
    const speakerMetrics = liveCoach.getSpeakerMetrics()
    const summary = liveCoach.getMetricsSummary()

    return NextResponse.json({
      tips: recentTips,
      speakerMetrics,
      summary,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Error getting coaching data:', error)
    return NextResponse.json(
      { error: 'Failed to get coaching data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    const liveCoach = getLiveCoach()

    switch (action) {
      case 'recordBreak':
        liveCoach.recordBreak()
        return NextResponse.json({ 
          success: true,
          message: 'Break recorded successfully',
          timestamp: Date.now()
        })

      case 'reset':
        liveCoach.reset()
        return NextResponse.json({ 
          success: true,
          message: 'Coaching data reset successfully'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing coaching action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    )
  }
}

// WebSocket endpoint for real-time coaching updates
export async function PATCH(request: NextRequest) {
  try {
    // Get auth header
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No authorization header' }, { status: 401 })
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { meetingId, subscriberId } = body

    if (!meetingId || !subscriberId) {
      return NextResponse.json({ error: 'Meeting ID and subscriber ID required' }, { status: 400 })
    }

    // Store subscription info for WebSocket updates
    // In production, this would be handled by the WebSocket manager
    const subscriptionData = {
      userId: user.id,
      meetingId,
      subscriberId,
      timestamp: Date.now()
    }

    return NextResponse.json({
      success: true,
      subscription: subscriptionData,
      message: 'Subscribed to coaching updates'
    })

  } catch (error) {
    console.error('Error subscribing to coaching updates:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500 }
    )
  }
}