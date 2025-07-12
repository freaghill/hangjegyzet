import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ZoomIntegration } from '@/lib/integrations/zoom'
import { headers } from 'next/headers'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('Zoom OAuth error:', error)
    return NextResponse.redirect(
      new URL('/settings/integrations?error=oauth_failed', request.url)
    )
  }

  // Initialize Zoom OAuth
  if (!code) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Get organization ID from user's active organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!member) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=no_organization', request.url)
      )
    }

    // Generate state with user and org info
    const stateData = {
      userId: user.id,
      organizationId: member.organization_id,
      timestamp: Date.now(),
    }
    const stateString = Buffer.from(JSON.stringify(stateData)).toString('base64')

    const zoom = new ZoomIntegration()
    const authUrl = zoom.getAuthUrl(stateString)

    return NextResponse.redirect(authUrl)
  }

  // Handle OAuth callback
  try {
    // Decode and validate state
    if (!state) {
      throw new Error('Missing state parameter')
    }

    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const { userId, organizationId } = stateData

    // Exchange code for tokens
    const zoom = new ZoomIntegration()
    const tokens = await zoom.getTokens(code)

    // Get user info from Zoom
    const zoomClient = new ZoomIntegration(tokens.access_token)
    const zoomUser = await zoomClient.getCurrentUser()

    // Save to database
    const supabase = await createClient()
    
    // Check if integration already exists
    const { data: existing } = await supabase
      .from('zoom_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single()

    const integrationData = {
      user_id: userId,
      organization_id: organizationId,
      zoom_user_id: zoomUser.id,
      zoom_email: zoomUser.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      webhook_verification_token: crypto.randomUUID(),
      is_active: true,
    }

    if (existing) {
      // Update existing integration
      const { error: updateError } = await supabase
        .from('zoom_integrations')
        .update(integrationData)
        .eq('id', existing.id)

      if (updateError) {
        throw updateError
      }
    } else {
      // Create new integration
      const { error: insertError } = await supabase
        .from('zoom_integrations')
        .insert(integrationData)

      if (insertError) {
        throw insertError
      }
    }

    // Import recent recordings (last 7 days)
    try {
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - 7)
      
      const recordings = await zoomClient.listRecordings('me', fromDate)
      
      if (recordings.meetings && recordings.meetings.length > 0) {
        // Store recordings in database
        const recordingsToInsert = recordings.meetings.map(meeting => ({
          integration_id: existing?.id || integrationData.user_id, // This will be updated after insert
          zoom_meeting_id: meeting.id.toString(),
          zoom_meeting_uuid: meeting.uuid,
          topic: meeting.topic,
          host_email: meeting.host_email,
          recording_files: meeting.recording_files,
          start_time: meeting.start_time,
          end_time: new Date(
            new Date(meeting.start_time).getTime() + meeting.duration * 60000
          ).toISOString(),
          duration: meeting.duration * 60, // Convert to seconds
          total_size: meeting.total_size,
          download_status: 'pending',
        }))

        // Get the actual integration ID
        const { data: integration } = await supabase
          .from('zoom_integrations')
          .select('id')
          .eq('user_id', userId)
          .eq('organization_id', organizationId)
          .single()

        if (integration) {
          // Update integration_id
          recordingsToInsert.forEach(rec => {
            rec.integration_id = integration.id
          })

          const { error: recordingError } = await supabase
            .from('zoom_recordings')
            .upsert(recordingsToInsert, {
              onConflict: 'zoom_meeting_uuid',
            })

          if (recordingError) {
            console.error('Failed to import recordings:', recordingError)
          }
        }
      }
    } catch (importError) {
      console.error('Failed to import initial recordings:', importError)
      // Don't fail the whole flow if import fails
    }

    return NextResponse.redirect(
      new URL('/settings/integrations?success=zoom_connected', request.url)
    )
  } catch (error) {
    console.error('Zoom OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings/integrations?error=database_error', request.url)
    )
  }
}