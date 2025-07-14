import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleCalendar, type GoogleCalendarTokens } from '@/lib/integrations/google-calendar'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { meetingId, summary, actionItems } = body

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID required' }, { status: 400 })
    }

    // Get meeting details
    const { data: meeting } = await supabase
      .from('meetings')
      .select('*, calendar_event_id, calendar_events!calendar_event_id(*)')
      .eq('id', meetingId)
      .single()

    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Check if meeting is linked to a calendar event
    if (!meeting.calendar_event_id || !meeting.calendar_events) {
      return NextResponse.json({ error: 'Meeting not linked to calendar event' }, { status: 404 })
    }

    const calendarEvent = meeting.calendar_events

    // Get calendar integration
    const { data: integration } = await supabase
      .from('google_calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Calendar not connected' }, { status: 404 })
    }

    // Check if token needs refresh
    let tokens: GoogleCalendarTokens = {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expiry_date: integration.token_expiry ? new Date(integration.token_expiry).getTime() : null,
    }

    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      tokens = await googleCalendar.refreshAccessToken(integration.refresh_token || '')
      
      await supabase
        .from('google_calendar_integrations')
        .update({
          access_token: tokens.access_token!,
          token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        })
        .eq('user_id', user.id)
    }

    // Build meeting URL
    const meetingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/meetings/${meetingId}`

    // Update calendar event with meeting summary
    const updatedEvent = await googleCalendar.addMeetingSummaryToEvent(
      tokens,
      calendarEvent.calendar_id,
      calendarEvent.event_id,
      summary || meeting.summary || '',
      actionItems || meeting.action_items || [],
      meetingUrl
    )

    if (!updatedEvent) {
      return NextResponse.json({ error: 'Failed to update calendar event' }, { status: 500 })
    }

    // Update our database
    await supabase
      .from('calendar_events')
      .update({
        description: updatedEvent.description,
        metadata: {
          ...calendarEvent.metadata,
          synced_at: new Date().toISOString(),
          has_summary: true,
        }
      })
      .eq('id', calendarEvent.id)

    return NextResponse.json({ success: true, event: updatedEvent })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Failed to sync with calendar' }, { status: 500 })
  }
}

// Sync all events for a given time range
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get calendar integration
    const { data: integration } = await supabase
      .from('google_calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Calendar not connected' }, { status: 404 })
    }

    // Check if token needs refresh
    let tokens: GoogleCalendarTokens = {
      access_token: integration.access_token,
      refresh_token: integration.refresh_token,
      expiry_date: integration.token_expiry ? new Date(integration.token_expiry).getTime() : null,
    }

    if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
      tokens = await googleCalendar.refreshAccessToken(integration.refresh_token || '')
      
      await supabase
        .from('google_calendar_integrations')
        .update({
          access_token: tokens.access_token!,
          token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        })
        .eq('user_id', user.id)
    }

    // Get selected calendar IDs
    const selectedCalendars = integration.calendars
      ?.filter((cal: any) => cal.selected)
      .map((cal: any) => cal.id) || []

    if (selectedCalendars.length === 0) {
      return NextResponse.json({ synced: 0, events: [] })
    }

    // Fetch events from the past 'days' days
    const timeMin = new Date()
    timeMin.setDate(timeMin.getDate() - days)
    
    const events = await googleCalendar.listUpcomingEvents(
      tokens,
      selectedCalendars,
      timeMin,
      new Date(),
      100 // Get more events for sync
    )

    // Sync events to our database
    let syncedCount = 0
    const syncedEvents = []

    for (const event of events) {
      if (!event.id) continue

      try {
        const eventData = {
          organization_id: profile.organization_id,
          calendar_id: selectedCalendars[0], // Use first calendar for now
          event_id: event.id,
          title: event.summary || 'Untitled Event',
          description: event.description,
          start_time: event.start.dateTime || event.start.date,
          end_time: event.end.dateTime || event.end.date,
          attendees: event.attendees || [],
          location: event.location,
          meeting_link: googleCalendar.extractMeetingLink(event),
          is_recurring: !!event.recurringEventId,
          recurring_event_id: event.recurringEventId,
        }

        const { data: syncedEvent } = await supabase
          .from('calendar_events')
          .upsert(eventData, {
            onConflict: 'organization_id,event_id',
            ignoreDuplicates: false,
          })
          .select()
          .single()

        if (syncedEvent) {
          syncedCount++
          syncedEvents.push(syncedEvent)
        }
      } catch (error) {
        console.error(`Failed to sync event ${event.id}:`, error)
      }
    }

    return NextResponse.json({ 
      synced: syncedCount, 
      total: events.length,
      events: syncedEvents 
    })
  } catch (error) {
    console.error('Sync all error:', error)
    return NextResponse.json({ error: 'Failed to sync events' }, { status: 500 })
  }
}