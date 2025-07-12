import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ZoomIntegration, getZoomClient } from '@/lib/integrations/zoom'
import { headers } from 'next/headers'

// Webhook event types we care about
const SUPPORTED_EVENTS = [
  'recording.completed',
  'recording.deleted',
  'recording.recovered',
  'recording.transcript_completed',
]

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const body = await request.json()

    // Log webhook for debugging
    const supabase = await createClient()
    await supabase.from('zoom_webhook_logs').insert({
      event_type: body.event,
      zoom_account_id: body.payload?.account_id,
      payload: body,
    })

    // Handle verification challenge
    if (body.event === 'endpoint.url_validation') {
      const verificationResponse = ZoomIntegration.handleVerificationChallenge(body)
      if (verificationResponse) {
        return NextResponse.json(verificationResponse)
      }
    }

    // Verify webhook signature
    const headersObj = Object.fromEntries(headersList.entries())
    const isValid = ZoomIntegration.verifyWebhookToken(
      body,
      headersObj,
      process.env.ZOOM_WEBHOOK_SECRET!
    )

    if (!isValid) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Check if we support this event
    if (!SUPPORTED_EVENTS.includes(body.event)) {
      return NextResponse.json({ message: 'Event not supported' })
    }

    // Process the webhook event
    switch (body.event) {
      case 'recording.completed':
        await handleRecordingCompleted(body.payload)
        break
      case 'recording.deleted':
        await handleRecordingDeleted(body.payload)
        break
      case 'recording.recovered':
        await handleRecordingRecovered(body.payload)
        break
      case 'recording.transcript_completed':
        await handleTranscriptCompleted(body.payload)
        break
    }

    // Update webhook log as processed
    await supabase
      .from('zoom_webhook_logs')
      .update({ processed: true })
      .eq('payload->event', body.event)
      .eq('payload->payload->object->uuid', body.payload?.object?.uuid)
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json({ message: 'Webhook processed' })
  } catch (error) {
    console.error('Webhook processing error:', error)
    
    // Log error
    const supabase = await createClient()
    await supabase
      .from('zoom_webhook_logs')
      .update({ 
        processed: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('processed', false)
      .order('created_at', { ascending: false })
      .limit(1)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleRecordingCompleted(payload: any) {
  const supabase = await createClient()
  const { object: recording } = payload

  // Find the integration based on host email
  const { data: integration } = await supabase
    .from('zoom_integrations')
    .select('*')
    .eq('zoom_email', recording.host_email)
    .eq('is_active', true)
    .single()

  if (!integration) {
    console.log('No active integration found for host:', recording.host_email)
    return
  }

  // Get participant information
  let participants = []
  try {
    const zoomClient = await getZoomClient(integration.user_id)
    if (zoomClient) {
      const participantData = await zoomClient.getMeetingParticipants(recording.id)
      participants = participantData.participants.map(p => ({
        name: p.name,
        email: p.email,
        join_time: p.join_time,
        leave_time: p.leave_time,
        duration: p.duration,
      }))
    }
  } catch (error) {
    console.error('Failed to fetch participants:', error)
  }

  // Calculate total size
  const totalSize = recording.recording_files?.reduce(
    (sum: number, file: any) => sum + (file.file_size || 0),
    0
  ) || 0

  // Store or update recording in database
  const recordingData = {
    integration_id: integration.id,
    zoom_meeting_id: recording.id.toString(),
    zoom_meeting_uuid: recording.uuid,
    topic: recording.topic,
    host_email: recording.host_email,
    participants: participants,
    recording_files: recording.recording_files,
    start_time: recording.start_time,
    end_time: new Date(
      new Date(recording.start_time).getTime() + recording.duration * 60000
    ).toISOString(),
    duration: recording.duration * 60, // Convert to seconds
    total_size: totalSize,
    download_status: integration.auto_download_enabled ? 'pending' : 'manual',
  }

  const { data: existingRecording } = await supabase
    .from('zoom_recordings')
    .select('id')
    .eq('zoom_meeting_uuid', recording.uuid)
    .single()

  if (existingRecording) {
    await supabase
      .from('zoom_recordings')
      .update(recordingData)
      .eq('id', existingRecording.id)
  } else {
    await supabase
      .from('zoom_recordings')
      .insert(recordingData)
  }

  // Trigger download if auto-download is enabled
  if (integration.auto_download_enabled) {
    // Queue download job
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/zoom/recordings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CRON_SECRET}`,
      },
      body: JSON.stringify({
        action: 'download',
        recordingUuid: recording.uuid,
      }),
    })
  }
}

async function handleRecordingDeleted(payload: any) {
  const supabase = await createClient()
  const { object: recording } = payload

  // Update recording status
  await supabase
    .from('zoom_recordings')
    .update({ 
      download_status: 'deleted',
      error: 'Recording deleted from Zoom'
    })
    .eq('zoom_meeting_uuid', recording.uuid)
}

async function handleRecordingRecovered(payload: any) {
  const supabase = await createClient()
  const { object: recording } = payload

  // Update recording status
  await supabase
    .from('zoom_recordings')
    .update({ 
      download_status: 'pending',
      error: null
    })
    .eq('zoom_meeting_uuid', recording.uuid)
}

async function handleTranscriptCompleted(payload: any) {
  const supabase = await createClient()
  const { object: recording } = payload

  // Update recording with transcript availability
  const { data: existingRecording } = await supabase
    .from('zoom_recordings')
    .select('recording_files')
    .eq('zoom_meeting_uuid', recording.uuid)
    .single()

  if (existingRecording) {
    // Add transcript file to recording files
    const updatedFiles = [
      ...(existingRecording.recording_files || []),
      {
        file_type: 'TRANSCRIPT',
        status: 'completed',
        recording_type: 'vtt',
      },
    ]

    await supabase
      .from('zoom_recordings')
      .update({ recording_files: updatedFiles })
      .eq('zoom_meeting_uuid', recording.uuid)
  }
}

// GET endpoint for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Zoom webhook endpoint',
    status: 'active'
  })
}