import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuggestionEngine } from '@/lib/realtime/suggestion-engine'

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

    // Get suggestions from the engine
    const suggestionEngine = getSuggestionEngine()
    const suggestions = suggestionEngine.getSuggestions(type)
    const context = suggestionEngine.getContext()
    const actionItems = suggestionEngine.getActionItems()
    const unansweredQuestions = suggestionEngine.getUnansweredQuestions()

    return NextResponse.json({
      suggestions,
      context,
      actionItems,
      unansweredQuestions,
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Error getting suggestions:', error)
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
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
    const { action, suggestionId, actionItemId } = body

    const suggestionEngine = getSuggestionEngine()

    switch (action) {
      case 'dismiss':
        if (!suggestionId) {
          return NextResponse.json({ error: 'Suggestion ID required' }, { status: 400 })
        }
        suggestionEngine.dismissSuggestion(suggestionId)
        return NextResponse.json({ success: true })

      case 'confirmAction':
        if (!actionItemId) {
          return NextResponse.json({ error: 'Action item ID required' }, { status: 400 })
        }
        suggestionEngine.confirmActionItem(actionItemId)
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing suggestion action:', error)
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    )
  }
}