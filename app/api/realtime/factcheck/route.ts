import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getFactChecker } from '@/lib/realtime/fact-checker'

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
    const type = searchParams.get('type') as any

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

    // Get fact check results from the engine
    const factChecker = getFactChecker()
    const results = factChecker.getResults(type)
    const commitments = factChecker.getCommitments()

    return NextResponse.json({
      factCheckResults: results,
      commitments,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Error getting fact check results:', error)
    return NextResponse.json(
      { error: 'Failed to get fact check results' },
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
    const { action, factCheckId, commitmentId, status } = body

    const factChecker = getFactChecker()

    switch (action) {
      case 'resolve':
        if (!factCheckId) {
          return NextResponse.json({ error: 'Fact check ID required' }, { status: 400 })
        }
        factChecker.resolveFactCheck(factCheckId)
        return NextResponse.json({ success: true })

      case 'updateCommitment':
        if (!commitmentId || !status) {
          return NextResponse.json({ error: 'Commitment ID and status required' }, { status: 400 })
        }
        factChecker.updateCommitmentStatus(commitmentId, status)
        return NextResponse.json({ success: true })

      case 'reset':
        factChecker.reset()
        return NextResponse.json({ 
          success: true,
          message: 'Fact checker reset successfully'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing fact check action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    )
  }
}

// Endpoint for manual fact checking
export async function PUT(request: NextRequest) {
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
    const { meetingId, statement, speaker } = body

    if (!meetingId || !statement || !speaker) {
      return NextResponse.json({ 
        error: 'Meeting ID, statement, and speaker required' 
      }, { status: 400 })
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

    // Process the statement through fact checker
    const factChecker = getFactChecker()
    const segment = {
      id: `manual-${Date.now()}`,
      meetingId,
      speaker,
      text: statement,
      startTime: Date.now(),
      endTime: Date.now() + 1000,
      confidence: 1.0
    }

    await factChecker.processSegment(segment)

    // Get immediate results
    const results = factChecker.getResults()
    const latestResults = results.filter(r => 
      r.timestamp >= segment.startTime
    )

    return NextResponse.json({
      success: true,
      results: latestResults,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Error processing manual fact check:', error)
    return NextResponse.json(
      { error: 'Failed to process fact check' },
      { status: 500 }
    )
  }
}