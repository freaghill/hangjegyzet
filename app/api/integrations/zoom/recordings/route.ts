import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getZoomClient } from '@/lib/integrations/zoom'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's Zoom recordings
    const { data: recordings, error } = await supabase
      .from('zoom_recordings')
      .select(`
        *,
        meeting:meetings(
          id,
          title,
          transcription_status
        )
      `)
      .eq('integration_id', user.id)
      .order('start_time', { ascending: false })
      .limit(50)

    if (error) {
      throw error
    }

    return NextResponse.json({ recordings })
  } catch (error) {
    console.error('Failed to fetch recordings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recordings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, recordingUuid } = body

    // Verify this is an internal request or user owns the recording
    const authHeader = request.headers.get('authorization')
    const isCronRequest = authHeader === `Bearer ${process.env.CRON_SECRET}`

    if (!isCronRequest) {
      // Verify user owns this recording
      const { data: recording } = await supabase
        .from('zoom_recordings')
        .select('integration_id')
        .eq('zoom_meeting_uuid', recordingUuid)
        .single()

      if (!recording) {
        return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
      }

      const { data: integration } = await supabase
        .from('zoom_integrations')
        .select('user_id')
        .eq('id', recording.integration_id)
        .single()

      if (!integration || integration.user_id !== user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    switch (action) {
      case 'download':
        return await downloadRecording(recordingUuid)
      case 'sync':
        return await syncRecordings(user.id)
      case 'import':
        return await importRecording(recordingUuid, user.id)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Recording operation error:', error)
    return NextResponse.json(
      { error: 'Operation failed' },
      { status: 500 }
    )
  }
}

async function downloadRecording(recordingUuid: string) {
  const supabase = await createClient()
  
  try {
    // Get recording details
    const { data: recording, error } = await supabase
      .from('zoom_recordings')
      .select(`
        *,
        integration:zoom_integrations(
          user_id,
          access_token,
          delete_after_download
        )
      `)
      .eq('zoom_meeting_uuid', recordingUuid)
      .single()

    if (error || !recording) {
      throw new Error('Recording not found')
    }

    // Update status to downloading
    await supabase
      .from('zoom_recordings')
      .update({ 
        download_status: 'downloading',
        download_started_at: new Date().toISOString()
      })
      .eq('id', recording.id)

    // Get Zoom client
    const zoomClient = await getZoomClient(recording.integration.user_id)
    if (!zoomClient) {
      throw new Error('Failed to get Zoom client')
    }

    // Find the main recording file (usually MP4)
    const mainRecording = recording.recording_files.find(
      (file: any) => file.file_type === 'MP4' && file.status === 'completed'
    )

    if (!mainRecording) {
      throw new Error('No downloadable recording found')
    }

    // Download the file
    const fileBuffer = await zoomClient.downloadRecordingFile(
      mainRecording.download_url,
      recording.integration.access_token
    )

    // Create a meeting record
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        title: recording.topic,
        date: recording.start_time,
        duration: recording.duration,
        participants: recording.participants.map((p: any) => p.name),
        user_id: recording.integration.user_id,
        organization_id: recording.organization_id,
        source: 'zoom',
        source_id: recording.zoom_meeting_uuid,
      })
      .select()
      .single()

    if (meetingError) {
      throw meetingError
    }

    // Upload to storage
    const fileName = `${meeting.id}/recording.mp4`
    const { error: uploadError } = await supabase.storage
      .from('meeting-recordings')
      .upload(fileName, fileBuffer, {
        contentType: 'video/mp4',
        upsert: true,
      })

    if (uploadError) {
      throw uploadError
    }

    // Update recording status
    await supabase
      .from('zoom_recordings')
      .update({ 
        download_status: 'completed',
        download_completed_at: new Date().toISOString(),
        meeting_id: meeting.id,
      })
      .eq('id', recording.id)

    // Delete from Zoom if configured
    if (recording.integration.delete_after_download) {
      try {
        await zoomClient.deleteRecording(recording.zoom_meeting_id, 'trash')
      } catch (deleteError) {
        console.error('Failed to delete Zoom recording:', deleteError)
      }
    }

    // Trigger transcription
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/meetings/${meeting.id}/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
    })

    return NextResponse.json({ 
      message: 'Recording downloaded successfully',
      meetingId: meeting.id 
    })
  } catch (error) {
    // Update status to failed
    await supabase
      .from('zoom_recordings')
      .update({ 
        download_status: 'failed',
        error: error instanceof Error ? error.message : 'Download failed'
      })
      .eq('zoom_meeting_uuid', recordingUuid)

    throw error
  }
}

async function syncRecordings(userId: string) {
  const supabase = await createClient()
  
  try {
    // Get Zoom client
    const zoomClient = await getZoomClient(userId)
    if (!zoomClient) {
      throw new Error('No active Zoom integration')
    }

    // Get integration details
    const { data: integration } = await supabase
      .from('zoom_integrations')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (!integration) {
      throw new Error('Integration not found')
    }

    // List recordings from last 30 days
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 30)
    
    const recordings = await zoomClient.listRecordings('me', fromDate)
    
    // Upsert recordings
    if (recordings.meetings && recordings.meetings.length > 0) {
      const recordingsToUpsert = recordings.meetings.map(meeting => ({
        integration_id: integration.id,
        zoom_meeting_id: meeting.id.toString(),
        zoom_meeting_uuid: meeting.uuid,
        topic: meeting.topic,
        host_email: meeting.host_email,
        recording_files: meeting.recording_files,
        start_time: meeting.start_time,
        end_time: new Date(
          new Date(meeting.start_time).getTime() + meeting.duration * 60000
        ).toISOString(),
        duration: meeting.duration * 60,
        total_size: meeting.total_size,
        download_status: 'pending',
      }))

      const { error } = await supabase
        .from('zoom_recordings')
        .upsert(recordingsToUpsert, {
          onConflict: 'zoom_meeting_uuid',
        })

      if (error) {
        throw error
      }
    }

    return NextResponse.json({ 
      message: 'Sync completed',
      count: recordings.meetings?.length || 0
    })
  } catch (error) {
    console.error('Sync failed:', error)
    throw error
  }
}

async function importRecording(recordingUuid: string, userId: string) {
  // Similar to download but triggered manually by user
  return await downloadRecording(recordingUuid)
}

// DELETE - Remove integration
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get Zoom client to revoke access
    const zoomClient = await getZoomClient(user.id)
    if (zoomClient) {
      try {
        await zoomClient.revokeAuthorization()
      } catch (error) {
        console.error('Failed to revoke Zoom access:', error)
      }
    }

    // Deactivate integration
    const { error } = await supabase
      .from('zoom_integrations')
      .update({ is_active: false })
      .eq('user_id', user.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Integration removed' })
  } catch (error) {
    console.error('Failed to remove integration:', error)
    return NextResponse.json(
      { error: 'Failed to remove integration' },
      { status: 500 }
    )
  }
}