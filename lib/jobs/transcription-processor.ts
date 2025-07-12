import { whisperTranscriber } from '@/lib/transcription/whisper'
import { parallelProcessor } from '@/lib/transcription/parallel-processor'
import { enhancedProcessor } from '@/lib/transcription/enhanced-processor'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionManager } from '@/lib/payments/subscription'
import { trackTranscriptionJob, trackMetric } from '@/lib/monitoring'
import { claudeAnalyzer } from '@/lib/ai/claude'
import { transcriptCleaner } from '@/lib/transcription/cleanup'
import { templateManager } from '@/lib/templates/meeting-templates'

interface TranscriptionSegment {
  text: string
  start: number
  end: number
  speaker?: string
  [key: string]: unknown
}

interface TranscriptionResult {
  text: string
  segments?: TranscriptionSegment[]
  language?: string
  duration?: number
  [key: string]: unknown
}

export interface TranscriptionJob {
  meetingId: string
  fileUrl: string
  organizationId: string
  userId?: string
  mode?: 'fast' | 'balanced' | 'precision' // Transcription mode
  options?: {
    startTime?: number
    endTime?: number
    language?: string
    customVocabulary?: string
    // Enhanced processing options
    enableEnhancedProcessing?: boolean
    enablePreprocessing?: boolean
    enableMultiPass?: boolean
    enableVocabularyEnhancement?: boolean
    enableAccuracyMonitoring?: boolean
    multiPassCount?: number
    temperatures?: number[]
    speakerCount?: number
    contextHints?: string[]
    minAudioQuality?: 'poor' | 'fair' | 'good' | 'excellent'
    minConfidenceScore?: number
  }
}

export class TranscriptionProcessor {
  /**
   * Process a transcription job based on selected mode
   */
  async processJob(job: TranscriptionJob): Promise<void> {
    const mode = job.mode || 'balanced' // Default to balanced if not specified
    console.log(`Processing transcription job for meeting ${job.meetingId} in ${mode} mode`)
    const startTime = Date.now()
    
    trackTranscriptionJob(job.meetingId, 'started', {
      fileSize: job.options?.endTime ? 
        (job.options.endTime - (job.options.startTime || 0)) : undefined,
      mode: mode,
      enhanced: mode === 'precision' || mode === 'balanced'
    })
    
    try {
      // Check if organization has available minutes for this mode
      const supabase = await createClient()
      const { data: modeAvailability } = await supabase
        .rpc('check_mode_availability', {
          p_organization_id: job.organizationId,
          p_mode: mode
        })
        .single()
        
      if (modeAvailability && !modeAvailability.available) {
        throw new Error(`Nincs elegendő ${mode} mód perc a havi keretben (${modeAvailability.used}/${modeAvailability.limit_minutes} használva)`)
      }

      let result: TranscriptionResult
      
      // Process based on mode
      switch (mode) {
        case 'fast':
          result = await this.processFastMode(job)
          break
          
        case 'balanced':
          result = await this.processBalancedMode(job)
          break
          
        case 'precision':
          result = await this.processPrecisionMode(job)
          break
          
        default:
          throw new Error(`Invalid transcription mode: ${mode}`)
      }

      // Process with Claude for intelligence analysis (all modes)
      await this.analyzeWithClaude(job.meetingId, result)

      // Track mode usage
      const duration = Math.ceil((result.duration || 0) / 60) // Convert to minutes
      if (duration > 0) {
        await supabase.rpc('increment_mode_usage', {
          p_organization_id: job.organizationId,
          p_mode: mode,
          p_minutes: duration
        })
      }

      // Send notification
      await this.notifyCompletion(job.meetingId)
      
      // Track successful completion
      const processingTime = Date.now() - startTime
      trackTranscriptionJob(job.meetingId, 'completed', {
        processingTime: processingTime / 1000,
        mode: mode,
        duration: duration
      })
      
      trackMetric('transcription.success_rate', 1, {
        mode: mode
      })

    } catch (error) {
      console.error('Transcription job failed:', error)
      
      // Track failure
      const processingTime = Date.now() - startTime
      trackTranscriptionJob(job.meetingId, 'failed', {
        processingTime: processingTime / 1000,
        mode: mode,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      trackMetric('transcription.success_rate', 0, {
        mode: mode
      })
      
      await this.handleJobFailure(job.meetingId, error)
    }
  }

  /**
   * Fast mode: Basic transcription without enhancements
   */
  private async processFastMode(job: TranscriptionJob): Promise<TranscriptionResult> {
    console.log('Processing in FAST mode - basic transcription')
    
    // Simple Whisper transcription
    const result = await whisperTranscriber.transcribe(
      job.fileUrl,
      job.meetingId,
      {
        startTime: job.options?.startTime,
        endTime: job.options?.endTime,
        language: job.options?.language || 'hu',
        prompt: job.options?.customVocabulary,
      }
    )
    
    return result
  }

  /**
   * Balanced mode: Enhanced processing without multi-pass
   */
  private async processBalancedMode(job: TranscriptionJob): Promise<TranscriptionResult> {
    console.log('Processing in BALANCED mode - enhanced single-pass transcription')
    
    // Get user ID if not provided
    let userId = job.userId
    if (!userId) {
      const supabase = await createClient()
      const { data: meeting } = await supabase
        .from('meetings')
        .select('created_by')
        .eq('id', job.meetingId)
        .single()
      userId = meeting?.created_by || ''
    }
    
    // Use enhanced processor with balanced settings
    const enhancedResult = await enhancedProcessor.process({
      organizationId: job.organizationId,
      meetingId: job.meetingId,
      fileUrl: job.fileUrl,
      userId: userId,
      startTime: job.options?.startTime,
      endTime: job.options?.endTime,
      language: job.options?.language || 'hu',
      enablePreprocessing: true, // Audio quality improvement
      enableMultiPass: false, // Single pass only
      enableVocabularyEnhancement: true, // Organization-specific terms
      enableAccuracyMonitoring: true,
      enableParallelProcessing: await this.shouldUseParallelProcessing(job),
      customVocabulary: job.options?.customVocabulary?.split(',').map(v => v.trim()),
      contextHints: job.options?.contextHints,
    })
    
    if (!enhancedResult.success) {
      throw new Error(enhancedResult.error || 'Balanced mode transcription failed')
    }
    
    return {
      text: enhancedResult.transcript.text,
      segments: enhancedResult.transcript.segments,
      language: enhancedResult.metadata.language,
      duration: enhancedResult.metadata.duration,
      metadata: enhancedResult.metadata
    }
  }

  /**
   * Precision mode: Full enhanced processing with multi-pass
   */
  private async processPrecisionMode(job: TranscriptionJob): Promise<TranscriptionResult> {
    console.log('Processing in PRECISION mode - maximum accuracy with multi-pass')
    
    // Get user ID if not provided
    let userId = job.userId
    if (!userId) {
      const supabase = await createClient()
      const { data: meeting } = await supabase
        .from('meetings')
        .select('created_by')
        .eq('id', job.meetingId)
        .single()
      userId = meeting?.created_by || ''
    }
    
    // Use enhanced processor with all features
    const enhancedResult = await enhancedProcessor.process({
      organizationId: job.organizationId,
      meetingId: job.meetingId,
      fileUrl: job.fileUrl,
      userId: userId,
      startTime: job.options?.startTime,
      endTime: job.options?.endTime,
      language: job.options?.language || 'hu',
      enablePreprocessing: true, // Audio quality improvement
      enableMultiPass: true, // Multi-pass for accuracy
      enableVocabularyEnhancement: true, // Organization-specific terms
      enableAccuracyMonitoring: true,
      enableParallelProcessing: await this.shouldUseParallelProcessing(job),
      multiPassCount: job.options?.multiPassCount || 2,
      temperatures: job.options?.temperatures || [0.0, 0.2],
      speakerCount: job.options?.speakerCount,
      customVocabulary: job.options?.customVocabulary?.split(',').map(v => v.trim()),
      contextHints: job.options?.contextHints,
      minAudioQuality: job.options?.minAudioQuality || 'fair',
      minConfidenceScore: job.options?.minConfidenceScore || 0.85
    })
    
    if (!enhancedResult.success) {
      throw new Error(enhancedResult.error || 'Precision mode transcription failed')
    }
    
    // Log warnings if any
    if (enhancedResult.warnings && enhancedResult.warnings.length > 0) {
      console.warn('Precision mode warnings:', enhancedResult.warnings)
    }
    
    return {
      text: enhancedResult.transcript.text,
      segments: enhancedResult.transcript.segments,
      language: enhancedResult.metadata.language,
      duration: enhancedResult.metadata.duration,
      metadata: enhancedResult.metadata
    }
  }

  /**
   * Analyze transcript with Claude
   */
  private async analyzeWithClaude(meetingId: string, transcription: TranscriptionResult): Promise<void> {
    const supabase = await createClient()
    
    try {
      console.log(`Analyzing meeting ${meetingId} with Claude`)
      
      // Get meeting to check for template
      const { data: meeting } = await supabase
        .from('meetings')
        .select('template_id')
        .eq('id', meetingId)
        .single()
      
      // Load template if assigned
      let template = null
      if (meeting?.template_id) {
        template = await templateManager.getTemplate(meeting.template_id)
        console.log(`Using template: ${template?.name}`)
      }
      
      // Clean the transcript before analysis
      const cleanedText = transcriptCleaner.clean(transcription.text)
      
      // Clean individual segments
      const cleanedSegments = transcription.segments?.map((segment: TranscriptionSegment) => ({
        ...segment,
        text: transcriptCleaner.clean(segment.text, {
          removeFillers: true,
          correctCommonErrors: true,
          removeRepetitions: true,
          fixSpacing: true,
          enhanceReadability: false // Keep original capitalization in segments
        })
      })) || []
      
      // Get cleanup statistics
      const stats = transcriptCleaner.getCleanupStats(transcription.text, cleanedText)
      console.log(`Transcript cleaned: ${stats.reduction}% reduction, ${stats.fillersRemoved} fillers removed`)
      
      // Create cleaned transcription object for Claude
      const cleanedTranscription = {
        ...transcription,
        text: cleanedText,
        segments: cleanedSegments
      }
      
      // Analyze with Claude using template if available
      const analysis = await claudeAnalyzer.analyze(cleanedTranscription, 'hu', template)
      
      // Extract speakers from transcript segments
      const speakers = this.extractSpeakers(transcription)
      
      // Update meeting with analysis results and cleaned transcript
      const updateData: any = {
        summary: analysis.summary,
        action_items: analysis.actionItems,
        intelligence_score: analysis.intelligenceScore,
        speakers: speakers,
        transcript: {
          text: cleanedText,
          segments: cleanedSegments,
          original_text: transcription.text // Keep original for reference
        },
        metadata: {
          ...transcription.metadata,
          sentiment: analysis.sentiment,
          topics: analysis.topics,
          keyPoints: analysis.keyPoints,
          nextSteps: analysis.nextSteps,
          analyzedAt: new Date().toISOString(),
          cleanup_stats: stats,
          cleaned: true
        }
      }
      
      // Add template-specific data if available
      if (template && analysis.sections) {
        updateData.template_data = {
          sections: analysis.sections,
          templateAnalysis: {
            sentiment: analysis.sentiment,
            topics: analysis.topics,
            keyPoints: analysis.keyPoints,
            nextSteps: analysis.nextSteps
          },
          templateValidation: templateManager.validateMeetingAgainstTemplate(
            template,
            { detectedSections: analysis.sections.filter(s => s.found).map(s => s.name) }
          )
        }
      }
      
      await supabase
        .from('meetings')
        .update(updateData)
        .eq('id', meetingId)
      
      console.log(`Claude analysis completed for meeting ${meetingId}`)
    } catch (error) {
      console.error('Claude analysis failed:', error)
      
      // Update with basic summary if Claude fails
      await supabase
        .from('meetings')
        .update({
          summary: 'Az AI elemzés sikertelen volt. Kérjük tekintse át manuálisan az átiratot.',
          intelligence_score: 0,
        })
        .eq('id', meetingId)
    }
  }
  
  /**
   * Extract unique speakers from transcript
   */
  private extractSpeakers(transcription: any): any[] {
    // For now, return a simple speaker list
    // In the future, this could use speaker diarization
    const speakerSet = new Set<string>()
    
    if (transcription.segments) {
      transcription.segments.forEach((segment: TranscriptionSegment) => {
        if (segment.speaker) {
          speakerSet.add(segment.speaker)
        }
      })
    }
    
    // If no speakers detected, return default
    if (speakerSet.size === 0) {
      return [
        { id: 1, name: 'Beszélő 1', duration: 0 },
        { id: 2, name: 'Beszélő 2', duration: 0 }
      ]
    }
    
    return Array.from(speakerSet).map((speaker, index) => ({
      id: index + 1,
      name: speaker,
      duration: 0 // TODO: Calculate actual speaking duration
    }))
  }

  /**
   * Send notification when transcription is complete
   */
  private async notifyCompletion(meetingId: string): Promise<void> {
    const supabase = await createClient()
    
    // Get meeting and user details
    const { data: meeting } = await supabase
      .from('meetings')
      .select(`
        title,
        created_by,
        duration,
        word_count,
        summary,
        action_items,
        transcript,
        profiles!inner(
          name,
          email
        )
      `)
      .eq('id', meetingId)
      .single()

    if (!meeting || !meeting.profiles?.email) return

    try {
      // Import email service
      const { emailService } = await import('@/lib/email/sendgrid')
      
      // Prepare action items for email
      const actionItems = meeting.action_items?.map((item: any) => ({
        task: item.task || item.text || item,
        assignee: item.assignee
      })) || []
      
      // Extract key points from transcript or summary
      const keyPoints = this.extractKeyPoints(meeting.summary || '')
      
      // Send meeting completed email
      await emailService.sendMeetingCompletedEmail(
        meeting.profiles.email,
        {
          id: meetingId,
          title: meeting.title,
          duration: meeting.duration || 0,
          wordCount: meeting.word_count || meeting.transcript?.text?.split(' ').length || 0,
          transcriptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/meetings/${meetingId}`,
          summary: meeting.summary,
          keyPoints: keyPoints,
          actionItems: actionItems
        }
      )
      
      console.log(`Meeting completion email sent to: ${meeting.profiles.email}`)
      
      // Update meeting to mark notification as sent
      await supabase
        .from('meetings')
        .update({
          notification_sent_at: new Date().toISOString()
        })
        .eq('id', meetingId)
        
    } catch (error) {
      console.error('Failed to send meeting completion email:', error)
      // Don't throw - we don't want to fail the transcription job due to email issues
    }
  }
  
  /**
   * Extract key points from summary text
   */
  private extractKeyPoints(summary: string): string[] {
    if (!summary) return []
    
    // Simple extraction - split by common delimiters
    const points = summary
      .split(/[\n•\-\d+\.]/)
      .map(point => point.trim())
      .filter(point => point.length > 20 && point.length < 200)
      .slice(0, 5) // Max 5 key points
      
    return points.length > 0 ? points : [summary.substring(0, 200) + '...']
  }

  /**
   * Handle job failure
   */
  private async handleJobFailure(meetingId: string, error: unknown): Promise<void> {
    const supabase = await createClient()
    
    const errorMessage = error instanceof Error ? error.message : 'Ismeretlen hiba'
    
    await supabase
      .from('meetings')
      .update({
        status: 'failed',
        error_message: errorMessage,
      })
      .eq('id', meetingId)

    // Get meeting and user details for notification
    const { data: meeting } = await supabase
      .from('meetings')
      .select(`
        title,
        profiles!inner(
          email
        )
      `)
      .eq('id', meetingId)
      .single()

    if (meeting?.profiles?.email) {
      try {
        const { emailService } = await import('@/lib/email/sendgrid')
        
        await emailService.sendEmail({
          to: meeting.profiles.email,
          subject: `⚠️ Meeting feldolgozás sikertelen: ${meeting.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Meeting feldolgozás sikertelen</h2>
              <p>Sajnáljuk, de nem sikerült feldolgozni a "<strong>${meeting.title}</strong>" meetinget.</p>
              
              <div style="background: #fee; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <p style="margin: 0;"><strong>Hiba oka:</strong> ${errorMessage}</p>
              </div>
              
              <p>Mit tehet:</p>
              <ul>
                <li>Próbálja meg újra feltölteni a fájlt</li>
                <li>Ellenőrizze, hogy a fájl nem sérült-e</li>
                <li>Győződjön meg róla, hogy támogatott formátumú (MP3, MP4, WAV, stb.)</li>
              </ul>
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/meetings/${meetingId}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Meeting megtekintése
              </a>
              
              <p>Ha a probléma továbbra is fennáll, kérjük vegye fel velünk a kapcsolatot.</p>
              
              <hr style="margin: 32px 0; border: none; border-top: 1px solid #e5e5e5;">
              <p style="color: #666; font-size: 14px;">
                HangJegyzet.AI - AI-alapú meeting jegyzetelés<br>
                <a href="https://hangjegyzet.ai" style="color: #2563eb;">hangjegyzet.ai</a>
              </p>
            </div>
          `,
          text: `
            Meeting feldolgozás sikertelen
            
            Sajnáljuk, de nem sikerült feldolgozni a "${meeting.title}" meetinget.
            
            Hiba oka: ${errorMessage}
            
            Mit tehet:
            - Próbálja meg újra feltölteni a fájlt
            - Ellenőrizze, hogy a fájl nem sérült-e
            - Győződjön meg róla, hogy támogatott formátumú (MP3, MP4, WAV, stb.)
            
            Meeting megtekintése: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/meetings/${meetingId}
            
            Ha a probléma továbbra is fennáll, kérjük vegye fel velünk a kapcsolatot.
            
            HangJegyzet.AI - AI-alapú meeting jegyzetelés
            https://hangjegyzet.ai
          `
        })
        
        console.log(`Failure notification sent to: ${meeting.profiles.email}`)
      } catch (emailError) {
        console.error('Failed to send failure notification email:', emailError)
      }
    }
  }

  /**
   * Determine if parallel processing should be used
   */
  private async shouldUseParallelProcessing(job: TranscriptionJob): Promise<boolean> {
    const supabase = await createClient()
    
    // Get file metadata
    const { data: meeting } = await supabase
      .from('meetings')
      .select('metadata')
      .eq('id', job.meetingId)
      .single()
    
    if (!meeting?.metadata) return false
    
    // Calculate duration based on time range
    const startTime = job.options?.startTime || 0
    const endTime = job.options?.endTime || Infinity
    
    // Estimate duration from file size (rough estimate)
    const fileSizeMB = (meeting.metadata.fileSize || 0) / (1024 * 1024)
    const estimatedDuration = fileSizeMB * 60 // ~1 minute per MB for compressed audio
    
    const effectiveDuration = Math.min(estimatedDuration, endTime) - startTime
    
    // Use parallel processing for files longer than 10 minutes
    return effectiveDuration > 600
  }

  /**
   * Process user feedback for enhanced transcription learning
   */
  async processFeedback(
    meetingId: string,
    corrections: Array<{
      originalText: string
      correctedText: string
      startTime?: number
      endTime?: number
    }>,
    userId: string
  ): Promise<void> {
    try {
      // Forward to enhanced processor for learning
      await enhancedProcessor.processFeedback(meetingId, corrections, userId)
      
      console.log(`Processed ${corrections.length} corrections for meeting ${meetingId}`)
      
      // Track feedback metric
      trackMetric('transcription.feedback_received', corrections.length, {
        meetingId,
        userId
      })
    } catch (error) {
      console.error('Failed to process transcription feedback:', error)
      trackMetric('transcription.feedback_failed', 1, {
        meetingId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}

// Export singleton
export const transcriptionProcessor = new TranscriptionProcessor()

/**
 * Process transcription in the background
 * This would typically be called by a job queue or webhook
 */
export async function processTranscriptionJob(job: TranscriptionJob): Promise<void> {
  await transcriptionProcessor.processJob(job)
}