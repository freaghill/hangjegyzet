import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { QueueService } from '@/lib/queue/queue.service'
import { JOB_PRIORITIES } from '@/lib/queue/config'
import { withRateLimit } from '@/lib/security/rate-limiter'
import { withAuditLog, AuditEvents } from '@/lib/security/audit-logger'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

async function handler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get meeting details
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*, profiles!meetings_created_by_fkey(organization_id)')
      .eq('id', params.id)
      .single()

    if (meetingError || !meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 })
    }

    // Verify user has access to this meeting
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userProfile?.organization_id !== meeting.profiles.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get request body for processing mode
    const body = await request.json()
    const mode = body.mode || 'balanced'
    const priority = mode === 'fast' ? JOB_PRIORITIES.HIGH : 
                    mode === 'precision' ? JOB_PRIORITIES.LOW : 
                    JOB_PRIORITIES.NORMAL

    // Download the audio file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('meetings')
      .download(meeting.file_url.split('/').slice(-2).join('/'))

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download audio file' }, { status: 500 })
    }

    // Save audio file temporarily for worker processing
    const tempFileName = `${randomUUID()}.mp3`
    const tempFilePath = join(process.env.TEMP_DIR || '/tmp', tempFileName)
    const buffer = Buffer.from(await fileData.arrayBuffer())
    await writeFile(tempFilePath, buffer)

    // Update meeting status to processing
    await supabase
      .from('meetings')
      .update({ status: 'processing' })
      .eq('id', params.id)

    // Add transcription job to queue
    const jobId = await QueueService.addTranscriptionJob(
      {
        meetingId: params.id,
        filePath: tempFilePath,
        userId: user.id,
        organizationId: meeting.profiles.organization_id,
        mode,
        language: body.language || 'hu',
      },
      priority
    )

    // Add AI processing jobs for summary and action items
    await Promise.all([
      QueueService.addAIProcessingJob(
        {
          meetingId: params.id,
          userId: user.id,
          organizationId: meeting.profiles.organization_id,
          type: 'summary',
          transcript: '', // Will be filled by transcription job
        },
        JOB_PRIORITIES.NORMAL
      ),
      QueueService.addAIProcessingJob(
        {
          meetingId: params.id,
          userId: user.id,
          organizationId: meeting.profiles.organization_id,
          type: 'action-items',
          transcript: '', // Will be filled by transcription job
        },
        JOB_PRIORITIES.NORMAL
      ),
    ])

    return NextResponse.json({
      success: true,
      message: 'Transcription job queued successfully',
      jobId,
      estimatedTime: mode === 'fast' ? '1-2 minutes' : 
                     mode === 'balanced' ? '2-5 minutes' : 
                     '5-10 minutes',
    })
  } catch (error) {
    console.error('Failed to queue transcription:', error)
    return NextResponse.json(
      { error: 'Failed to queue transcription', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Export with rate limiting and audit logging
export const POST = withRateLimit(
  withAuditLog(handler, AuditEvents.MEETING_CREATE, 'meeting'),
  'ai'
)