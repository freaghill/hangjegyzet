import { Worker, Job } from 'bullmq'
import { createClient } from '@/lib/supabase/server'
import { OpenAI } from 'openai'
import { createReadStream } from 'fs'
import { QUEUE_NAMES, WORKER_SETTINGS } from '../config'
import { auditLogger, AuditEvents } from '@/lib/security/audit-logger'
import { emailService } from '@/lib/email/sendgrid'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export interface TranscriptionJobData {
  meetingId: string
  filePath: string
  userId: string
  organizationId: string
  mode: 'fast' | 'balanced' | 'precision'
  language?: string
}

async function processTranscription(job: Job<TranscriptionJobData>) {
  const { meetingId, filePath, userId, organizationId, mode, language = 'hu' } = job.data
  
  try {
    // Update job progress
    await job.updateProgress(10)
    
    // Get Whisper model based on mode
    const model = mode === 'fast' ? 'whisper-1' : 'whisper-1'
    const prompt = language === 'hu' ? 
      'Ez egy magyar nyelvű üzleti megbeszélés felvétele.' : 
      undefined
    
    // Transcribe audio
    await job.updateProgress(20)
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(filePath),
      model,
      language,
      prompt,
      response_format: 'verbose_json',
      temperature: mode === 'precision' ? 0 : 0.2,
    })
    
    await job.updateProgress(60)
    
    // Process segments for speaker diarization
    const segments = transcription.segments?.map(seg => ({
      text: seg.text,
      start: seg.start,
      end: seg.end,
      speaker: 'Speaker 1', // Basic diarization
    })) || []
    
    // Update meeting in database
    const supabase = await createClient()
    
    await job.updateProgress(80)
    
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        transcript: {
          text: transcription.text,
          segments,
          language,
          duration: transcription.duration,
        },
        status: 'transcribed',
        processing_mode: mode,
        processed_at: new Date().toISOString(),
      })
      .eq('id', meetingId)
    
    if (updateError) throw updateError
    
    // Log successful transcription
    await auditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: 'transcription.complete',
      resource_type: 'meeting',
      resource_id: meetingId,
      metadata: {
        mode,
        duration: transcription.duration,
        word_count: transcription.text.split(' ').length,
      },
    })
    
    await job.updateProgress(100)
    
    // Trigger webhook for meeting completion
    const { WebhookEvents } = await import('@/lib/webhooks/trigger')
    await WebhookEvents.meetingCompleted(
      { id: meetingId, organization_id: organizationId },
      transcription
    )
    
    // Send email notification to meeting owner
    try {
      // Get meeting details and owner email with preferences
      const { data: meeting } = await supabase
        .from('meetings')
        .select(`
          id,
          title,
          created_by,
          profiles!inner(
            email,
            settings
          )
        `)
        .eq('id', meetingId)
        .single()
      
      if (meeting && meeting.profiles?.email) {
        // Check if user wants meeting completion emails
        const userSettings = meeting.profiles.settings || {}
        const emailPreferences = userSettings.emailPreferences || { meetingCompleted: true }
        
        if (emailPreferences.meetingCompleted !== false) {
          const transcriptUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://hangjegyzet.ai'}/meetings/${meetingId}`
          
          await emailService.sendMeetingCompletedEmail(
            meeting.profiles.email,
            {
              id: meetingId,
              title: meeting.title || 'Névtelen meeting',
              duration: transcription.duration || 0,
              wordCount: transcription.text.split(' ').length,
              transcriptUrl,
              summary: transcription.summary,
            }
          )
        }
      }
    } catch (emailError) {
      // Log error but don't fail the job
      console.error('Failed to send meeting completion email:', emailError)
    }
    
    return {
      success: true,
      meetingId,
      duration: transcription.duration,
      wordCount: transcription.text.split(' ').length,
    }
    
  } catch (error) {
    // Log failure
    await auditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: 'transcription.failed',
      resource_type: 'meeting',
      resource_id: meetingId,
      status: 'failure',
      error_message: error instanceof Error ? error.message : 'Unknown error',
    })
    
    throw error
  }
}

// Create worker
export const transcriptionWorker = new Worker(
  QUEUE_NAMES.TRANSCRIPTION,
  processTranscription,
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    ...WORKER_SETTINGS[QUEUE_NAMES.TRANSCRIPTION],
  }
)

// Worker event handlers
transcriptionWorker.on('completed', (job) => {
  console.log(`Transcription completed for meeting ${job.data.meetingId}`)
})

transcriptionWorker.on('failed', (job, err) => {
  console.error(`Transcription failed for meeting ${job?.data.meetingId}:`, err)
})

transcriptionWorker.on('stalled', (jobId) => {
  console.warn(`Transcription job ${jobId} stalled`)
})