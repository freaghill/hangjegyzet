import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getDecisionTracker } from '@/lib/realtime/decision-tracker'

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
    const status = searchParams.get('status') as any
    const decisionId = searchParams.get('decisionId')

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

    // Get decision data from the tracker
    const decisionTracker = getDecisionTracker()

    if (decisionId) {
      // Get specific decision
      const decision = decisionTracker.getDecisionById(decisionId)
      if (!decision) {
        return NextResponse.json({ error: 'Decision not found' }, { status: 404 })
      }
      return NextResponse.json({
        decision,
        timestamp: Date.now()
      })
    }

    // Get all decisions
    const decisions = decisionTracker.getDecisions(status)
    const conflicts = decisionTracker.getConflicts()
    const activeDiscussion = decisionTracker.getActiveDiscussion()

    return NextResponse.json({
      decisions,
      conflicts,
      activeDiscussion,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Error getting decision data:', error)
    return NextResponse.json(
      { error: 'Failed to get decision data' },
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
    const { action, decisionId, conflictId, status } = body

    const decisionTracker = getDecisionTracker()

    switch (action) {
      case 'updateStatus':
        if (!decisionId || !status) {
          return NextResponse.json({ 
            error: 'Decision ID and status required' 
          }, { status: 400 })
        }
        decisionTracker.updateDecisionStatus(decisionId, status)
        return NextResponse.json({ success: true })

      case 'resolveConflict':
        if (!conflictId) {
          return NextResponse.json({ error: 'Conflict ID required' }, { status: 400 })
        }
        decisionTracker.resolveConflict(conflictId)
        return NextResponse.json({ success: true })

      case 'reset':
        decisionTracker.reset()
        return NextResponse.json({ 
          success: true,
          message: 'Decision tracker reset successfully'
        })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing decision action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    )
  }
}

// Endpoint for exporting decisions
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
    const { meetingId, format = 'json' } = body

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
    }

    // Verify user has access to the meeting
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, organization_id, title')
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

    // Get all decisions
    const decisionTracker = getDecisionTracker()
    const decisions = decisionTracker.getDecisions()
    const conflicts = decisionTracker.getConflicts()

    if (format === 'markdown') {
      // Generate markdown format
      let markdown = `# Meeting Decisions - ${meeting.title}\n\n`
      markdown += `Date: ${new Date().toLocaleDateString()}\n\n`
      
      // Group decisions by status
      const grouped = {
        agreed: decisions.filter(d => d.status === 'agreed'),
        proposed: decisions.filter(d => d.status === 'proposed'),
        deferred: decisions.filter(d => d.status === 'deferred'),
        rejected: decisions.filter(d => d.status === 'rejected')
      }

      if (grouped.agreed.length > 0) {
        markdown += `## Agreed Decisions\n\n`
        grouped.agreed.forEach(d => {
          markdown += `### ${d.description}\n`
          markdown += `- Quality Score: ${d.qualityScore}%\n`
          markdown += `- Made by: ${d.madeBy.join(', ')}\n`
          if (d.conditions.length > 0) {
            markdown += `- Conditions: ${d.conditions.join('; ')}\n`
          }
          markdown += '\n'
        })
      }

      if (grouped.proposed.length > 0) {
        markdown += `## Proposed Decisions (Pending)\n\n`
        grouped.proposed.forEach(d => {
          markdown += `- ${d.description} (${d.madeBy.join(', ')})\n`
        })
        markdown += '\n'
      }

      if (conflicts.length > 0) {
        markdown += `## Decision Conflicts\n\n`
        conflicts.forEach(c => {
          markdown += `- **${c.conflictType}**: ${c.description}\n`
          markdown += `  - Decision 1: ${c.decision1.description}\n`
          markdown += `  - Decision 2: ${c.decision2.description}\n\n`
        })
      }

      return NextResponse.json({
        format: 'markdown',
        content: markdown,
        timestamp: Date.now()
      })
    }

    // Default JSON format
    return NextResponse.json({
      format: 'json',
      decisions,
      conflicts,
      summary: {
        total: decisions.length,
        agreed: decisions.filter(d => d.status === 'agreed').length,
        pending: decisions.filter(d => d.status === 'proposed').length,
        deferred: decisions.filter(d => d.status === 'deferred').length,
        rejected: decisions.filter(d => d.status === 'rejected').length,
        conflicts: conflicts.length
      },
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Error exporting decisions:', error)
    return NextResponse.json(
      { error: 'Failed to export decisions' },
      { status: 500 }
    )
  }
}