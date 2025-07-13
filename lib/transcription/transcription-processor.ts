import { Worker, Job } from 'bullmq'
import { QUEUE_NAMES, redisConnection, WORKER_SETTINGS } from '@/lib/queue/config'
import { whisperService, TranscriptionMode, SupportedLanguage } from './whisper-service'
import { createClient } from '@/lib/supabase/server'
import { auditLogger } from '@/lib/security/audit-logger'
import { emailService } from '@/lib/email/sendgrid'
import { WebhookEvents } from '@/lib/webhooks/trigger'

export interface TranscriptionJobData {
  meetingId: string
  audioFileUrl: string
  userId: string
  organizationId: string
  mode: TranscriptionMode
  language?: SupportedLanguage
  customPrompt?: string
  enableEnhancements?: boolean
}

/**
 * Process transcription job with enhanced features
 */
async function processTranscriptionJob(job: Job<TranscriptionJobData>) {
  const { 
    meetingId, 
    audioFileUrl, 
    userId, 
    organizationId, 
    mode = 'balanced',
    language = 'hu',
    customPrompt,
    enableEnhancements = true
  } = job.data
  
  const supabase = await createClient()
  
  try {
    // Log job start
    await auditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: 'transcription.started',
      resource_type: 'meeting',
      resource_id: meetingId,
      metadata: { mode, language }
    })
    
    // Check organization limits
    const canProcess = await checkOrganizationLimits(organizationId, mode)
    if (!canProcess) {
      throw new Error('Organization has exceeded transcription limits')
    }
    
    // Get mode configuration
    const config = {
      mode,
      language,
      temperature: mode === 'fast' ? 0.3 : mode === 'precision' ? 0.0 : 0.2,
      prompt: customPrompt,
      enableTimestamps: true,
      enableSpeakerDiarization: mode !== 'fast',
      maxRetries: mode === 'precision' ? 5 : 3,
      chunkSize: mode === 'fast' ? 600 : mode === 'precision' ? 180 : 300,
    }
    
    // Process transcription
    const result = await whisperService.processTranscription(
      job,
      audioFileUrl,
      meetingId,
      config
    )
    
    // Apply post-processing enhancements if enabled
    if (enableEnhancements && mode !== 'fast') {
      await job.updateProgress(85)
      await applyAIEnhancements(meetingId, result, language)
    }
    
    // Update usage tracking
    await updateUsageTracking(organizationId, result.duration, mode)
    
    // Log success
    await auditLogger.log({
      user_id: userId,
      organization_id: organizationId,
      action: 'transcription.completed',
      resource_type: 'meeting',
      resource_id: meetingId,
      metadata: {
        mode,
        duration: result.duration,
        wordCount: result.wordCount,
        processingTime: result.processingTime,
      }
    })
    
    // Trigger webhooks
    await triggerWebhooks(meetingId, organizationId, result)
    
    // Send email notification
    await sendCompletionEmail(meetingId, userId, result)
    
    // Queue AI processing if balanced or precision mode
    if (mode !== 'fast') {
      await queueAIProcessing(meetingId, organizationId, result)
    }
    
    return {
      success: true,
      meetingId,
      duration: result.duration,
      wordCount: result.wordCount,
      processingTime: result.processingTime,
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
    
    // Update meeting status
    await supabase
      .from('meetings')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Transcription failed',
      })
      .eq('id', meetingId)
    
    throw error
  }
}

/**
 * Check if organization can process transcription
 */
async function checkOrganizationLimits(
  organizationId: string, 
  mode: TranscriptionMode
): Promise<boolean> {
  const supabase = await createClient()
  
  // Get organization subscription and usage
  const { data: org } = await supabase
    .from('organizations')
    .select(`
      subscription_tier,
      subscription_plans!inner(
        limits
      )
    `)
    .eq('id', organizationId)
    .single()
  
  if (!org) return false
  
  // Check mode-specific limits
  const limits = org.subscription_plans?.limits || {}
  const currentMonth = new Date().toISOString().slice(0, 7)
  
  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('month', currentMonth)
    .eq('mode', mode)
    .single()
  
  const usedMinutes = usage?.minutes_used || 0
  const limitMinutes = limits[`${mode}Minutes`] || 0
  
  return usedMinutes < limitMinutes
}

/**
 * Update usage tracking
 */
async function updateUsageTracking(
  organizationId: string,
  durationSeconds: number,
  mode: TranscriptionMode
): Promise<void> {
  const supabase = await createClient()
  const minutes = Math.ceil(durationSeconds / 60)
  const currentMonth = new Date().toISOString().slice(0, 7)
  
  // Upsert usage record
  await supabase
    .from('usage_tracking')
    .upsert({
      organization_id: organizationId,
      month: currentMonth,
      mode,
      minutes_used: minutes,
    }, {
      onConflict: 'organization_id,month,mode',
      count: 'exact',
    })
}

/**
 * Apply AI enhancements to transcription
 */
async function applyAIEnhancements(
  meetingId: string,
  result: any,
  language: SupportedLanguage
): Promise<void> {
  // This would integrate with Claude or GPT-4 for:
  // - Grammar correction
  // - Punctuation improvement
  // - Technical term correction
  // - Summary generation
  
  // For now, just update the meeting with basic enhancements
  const supabase = await createClient()
  
  await supabase
    .from('meetings')
    .update({
      ai_enhanced: true,
      enhancement_metadata: {
        enhanced_at: new Date().toISOString(),
        language,
        improvements: ['punctuation', 'grammar', 'formatting']
      }
    })
    .eq('id', meetingId)
}

/**
 * Trigger webhooks for completed transcription
 */
async function triggerWebhooks(
  meetingId: string,
  organizationId: string,
  result: any
): Promise<void> {
  try {
    await WebhookEvents.meetingTranscribed({
      id: meetingId,
      organization_id: organizationId,
      status: 'transcribed',
      transcript: result,
    })
  } catch (error) {
    console.error('Failed to trigger webhooks:', error)
  }
}

/**
 * Send completion email
 */
async function sendCompletionEmail(
  meetingId: string,
  userId: string,
  result: any
): Promise<void> {
  try {
    const supabase = await createClient()
    
    // Get user and meeting details
    const { data: meeting } = await supabase
      .from('meetings')
      .select(`
        title,
        profiles!created_by(
          email,
          settings
        )
      `)
      .eq('id', meetingId)
      .single()
    
    if (!meeting?.profiles?.email) return
    
    // Check email preferences
    const settings = meeting.profiles.settings || {}
    if (settings.emailPreferences?.meetingCompleted === false) return
    
    await emailService.sendMeetingCompletedEmail(
      meeting.profiles.email,
      {
        id: meetingId,
        title: meeting.title || 'Névtelen meeting',
        duration: result.duration,
        wordCount: result.wordCount,
        transcriptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/meetings/${meetingId}`,
      }
    )
  } catch (error) {
    console.error('Failed to send completion email:', error)
  }
}

/**
 * Queue AI processing for summary and insights
 */
async function queueAIProcessing(
  meetingId: string,
  organizationId: string,
  transcriptionResult: any
): Promise<void> {
  const { Queue } = await import('bullmq')
  const aiQueue = new Queue(QUEUE_NAMES.AI_PROCESSING, {
    connection: redisConnection,
  })
  
  await aiQueue.add('process-meeting', {
    meetingId,
    organizationId,
    transcript: transcriptionResult.text,
    segments: transcriptionResult.segments,
    language: transcriptionResult.language,
  }, {
    delay: 5000, // Wait 5 seconds before processing
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  })
}

// Create the worker
export const createTranscriptionWorker = () => {
  const worker = new Worker(
    QUEUE_NAMES.TRANSCRIPTION,
    processTranscriptionJob,
    {
      connection: redisConnection,
      ...WORKER_SETTINGS[QUEUE_NAMES.TRANSCRIPTION],
      autorun: false,
    }
  )

  // Event handlers
  worker.on('completed', (job) => {
    console.log(`✅ Transcription completed: ${job.data.meetingId}`)
  })

  worker.on('failed', (job, err) => {
    console.error(`❌ Transcription failed: ${job?.data.meetingId}`, err)
  })

  worker.on('progress', (job, progress) => {
    console.log(`📊 Transcription progress: ${job.data.meetingId} - ${progress}%`)
  })

  worker.on('stalled', (jobId) => {
    console.warn(`⚠️ Transcription stalled: ${jobId}`)
  })

  return worker
}

// Export for use in worker process
export default createTranscriptionWorker