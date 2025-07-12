import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { googleCalendar } from '@/lib/integrations/google-calendar'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=${error}`
    )
  }

  if (!code || !state) {
    // Generate auth URL and redirect
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate state with user ID for security
    const authState = Buffer.from(
      JSON.stringify({ userId: user.id, timestamp: Date.now() })
    ).toString('base64')

    const authUrl = googleCalendar.getAuthUrl(authState)
    return NextResponse.redirect(authUrl)
  }

  try {
    // Exchange code for tokens
    const tokens = await googleCalendar.getTokens(code)
    
    // Decode state to get user ID
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString())
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.id !== decodedState.userId) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get list of calendars
    const calendars = await googleCalendar.listCalendars(tokens)
    
    // Store tokens and calendar list in database
    const { error: dbError } = await supabase
      .from('google_calendar_integrations')
      .upsert({
        user_id: user.id,
        organization_id: profile.organization_id,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token!,
        token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        calendars: calendars.map(cal => ({
          id: cal.id,
          name: cal.summary,
          primary: cal.primary || false,
          selected: cal.primary || false, // Auto-select primary calendar
        })),
        is_active: true,
      }, {
        onConflict: 'user_id,organization_id'
      })

    if (dbError) {
      console.error('Failed to store tokens:', dbError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=database_error`
      )
    }

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=google_calendar_connected`
    )
  } catch (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=oauth_failed`
    )
  }
}

export async function DELETE(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the integration
    const { data: integration } = await supabase
      .from('google_calendar_integrations')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Revoke access from Google
    try {
      await googleCalendar.revokeAccess({
        access_token: integration.access_token,
        refresh_token: integration.refresh_token,
      })
    } catch (error) {
      console.error('Failed to revoke Google access:', error)
      // Continue with deletion even if revoke fails
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('google_calendar_integrations')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete integration' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete integration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { calendars } = body

    if (!calendars || !Array.isArray(calendars)) {
      return NextResponse.json({ error: 'Invalid calendars data' }, { status: 400 })
    }

    // Update selected calendars
    const { error: updateError } = await supabase
      .from('google_calendar_integrations')
      .update({ calendars })
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update calendars' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update calendars error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}