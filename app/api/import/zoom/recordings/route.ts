import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Zoom integration
    const { data: integration, error: integrationError } = await adminSupabase
      .from('user_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'zoom')
      .single()

    if (integrationError || !integration) {
      return NextResponse.json(
        { error: 'Zoom not connected' },
        { status: 400 }
      )
    }

    // Check if token needs refresh
    const expiresAt = new Date(integration.expires_at)
    if (expiresAt < new Date()) {
      // Refresh token
      const refreshResponse = await fetch('https://zoom.us/oauth/token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(
            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: integration.refresh_token,
        }),
      })

      if (refreshResponse.ok) {
        const tokenData = await refreshResponse.json()
        
        // Update tokens
        await adminSupabase
          .from('user_integrations')
          .update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          })
          .eq('id', integration.id)

        integration.access_token = tokenData.access_token
      }
    }

    // Fetch recordings from last 30 days
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 30)
    
    const recordingsResponse = await fetch(
      `https://api.zoom.us/v2/users/me/recordings?` +
      `from=${fromDate.toISOString().split('T')[0]}&` +
      `page_size=100`,
      {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
        },
      }
    )

    if (!recordingsResponse.ok) {
      const error = await recordingsResponse.text()
      console.error('Zoom API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch recordings' },
        { status: 500 }
      )
    }

    const recordingsData = await recordingsResponse.json()
    
    // Transform recordings for import
    const recordings = recordingsData.meetings?.map((meeting: any) => ({
      id: meeting.uuid,
      topic: meeting.topic,
      start_time: meeting.start_time,
      duration: meeting.duration,
      recording_files: meeting.recording_files?.filter((file: any) => 
        file.file_type === 'MP4' || file.file_type === 'M4A'
      ).map((file: any) => ({
        id: file.id,
        file_type: file.file_type,
        file_size: file.file_size,
        download_url: file.download_url,
        recording_type: file.recording_type,
      })),
    })).filter((meeting: any) => meeting.recording_files?.length > 0) || []

    return NextResponse.json({ recordings })

  } catch (error) {
    console.error('Zoom recordings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recordings' },
      { status: 500 }
    )
  }
}