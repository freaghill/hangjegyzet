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
  mode?: 'fast' | 'balanced' | 'precision' // NEW: Transcription mode
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
   * Process a transcription job
   */
  async processJob(job: TranscriptionJob): Promise<void> {
    const mode = job.mode || 'balanced' // Default to balanced if not specified
    console.log(`Processing transcription job for meeting ${job.meetingId} in ${mode} mode`)
    const startTime = Date.now()
    
    trackTranscriptionJob(job.meetingId, 'started', {
      fileSize: job.options?.endTime ? 
        (job.options.endTime - (job.options.startTime || 0)) : undefined,
      mode: mode,
      enhanced: job.options?.enableEnhancedProcessing || false
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

      let result
      let processorType = mode
      
      // Mode-based processing configuration
      if (mode === 'precision') {
        // Precision mode: Always use enhanced processor with all features
        console.log('Using precision mode with enhanced transcription processor')
        processorType = 'precision'
        
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
          enablePreprocessing: job.options?.enablePreprocessing ?? true,
          enableMultiPass: job.options?.enableMultiPass ?? true,
          enableVocabularyEnhancement: job.options?.enableVocabularyEnhancement ?? true,
          enableAccuracyMonitoring: job.options?.enableAccuracyMonitoring ?? true,
          enableParallelProcessing: await this.shouldUseParallelProcessing(job),
          multiPassCount: job.options?.multiPassCount || 2,
          temperatures: job.options?.temperatures,
          speakerCount: job.options?.speakerCount,
          customVocabulary: job.options?.customVocabulary?.split(',').map(v => v.trim()),
          contextHints: job.options?.contextHints,
          minAudioQuality: job.options?.minAudioQuality,
          minConfidenceScore: job.options?.minConfidenceScore
        })
        
        if (!enhancedResult.success) {
          throw new Error(enhancedResult.error || 'Enhanced transcription failed')
        }
        
        // Convert enhanced result to standard format
        result = {
          text: enhancedResult.transcript.text,
          segments: enhancedResult.transcript.segments,
          language: enhancedResult.metadata.language,
          duration: enhancedResult.metadata.duration,
          metadata: enhancedResult.metadata
        }
        
        // Log warnings if any
        if (enhancedResult.warnings && enhancedResult.warnings.length > 0) {
          console.warn('Enhanced transcription warnings:', enhancedResult.warnings)
        }
      } else {
        // Determine if we should use parallel processing
        const shouldUseParallel = await this.shouldUseParallelProcessing(job)
        processorType = shouldUseParallel ? 'parallel' : 'sequential'
        
        // Start transcription with appropriate processor
        result = shouldUseParallel
          ? await parallelProcessor.process(
              job.fileUrl,
              job.meetingId,
              {
                startTime: job.options?.startTime,
                endTime: job.options?.endTime,
                language: job.options?.language || 'hu',
                prompt: job.options?.customVocabulary,
              }
            )
          : await whisperTranscriber.transcribe(
              job.fileUrl,
              job.meetingId,
              {
                startTime: job.options?.startTime,
                endTime: job.options?.endTime,
                language: job.options?.language || 'hu',
                prompt: job.options?.customVocabulary,
              }
            )
      }

      // Process with Claude for intelligence analysis
      await this.analyzeWithClaude(job.meetingId, result)

      // Send notification
      await this.notifyCompletion(job.meetingId)
      
      // Track successful completion
      const processingTime = Date.now() - startTime
      trackTranscriptionJob(job.meetingId, 'completed', {
        processingTime: processingTime / 1000,
        processor: processorType,
        enhanced: useEnhancedProcessing
      })
      
      trackMetric('transcription.success_rate', 1, {
        processor: processorType
      })

    } catch (error) {
      console.error('Transcription job failed:', error)
      
      // Track failure
      const processingTime = Date.now() - startTime
      trackTranscriptionJob(job.meetingId, 'failed', {
        processingTime: processingTime / 1000,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      
      trackMetric('transcription.success_rate', 0, {
        processor: 'unknown'
      })
      
      await this.handleJobFailure(job.meetingId, error)
    }
  }

  /**
   * Clean transcript text and segments
   */
  private async cleanTranscript(meetingId: string, transcription: TranscriptionResult): Promise<TranscriptionResult> {
    const supabase = await createClient()
    
    try {
      console.log(`Cleaning transcript for meeting ${meetingId}`)
      
      // Clean the main transcript text
      const cleanedText = transcriptCleaner.clean(transcription.text)
      
      // Clean individual segments
      const cleanedSegments = transcription.segments?.map((segment: TranscriptionSegment) => ({
        ...segment,
        text: transcriptCleaner.clean(segment.text, {
          removeFillers: true,
          fixSpacing: true,
          correctCommonErrors: true,
          removeRepetitions: true,
          enhanceReadability: false // Keep original capitalization in segments
        })
      })) || []
      
      // Get cleanup statistics
      const stats = transcriptCleaner.getCleanupStats(transcription.text, cleanedText)
      console.log(`Transcript cleanup stats:`, stats)
      
      // Create cleaned transcription object
      const cleanedTranscription = {
        ...transcription,
        text: cleanedText,
        segments: cleanedSegments,
        originalText: transcription.text, // Keep original for reference
        cleanupStats: stats
      }
      
      // Update meeting with cleaned transcript
      await supabase
        .from('meetings')
        .update({
          transcript: {
            text: cleanedText,
            segments: cleanedSegments,
            originalText: transcription.text,
            cleanupStats: stats
          }
        })
        .eq('id', meetingId)
      
      return cleanedTranscription
    } catch (error) {
      console.error('Transcript cleanup failed:', error)
      // Return original if cleanup fails
      return transcription
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
        profiles!inner(
          name,
          email
        )
      `)
      .eq('id', meetingId)
      .single()

    if (!meeting) return

    // TODO: Send email notification
    console.log(`Notification would be sent to: ${meeting.profiles?.email}`)
    
    // TODO: Send in-app notification
    // TODO: Send Slack notification if configured
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

    // TODO: Send failure notification
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
   * Determine if enhanced processing should be used
   */
  private shouldUseEnhancedProcessing(job: TranscriptionJob): boolean {
    // Check environment variable
    const enhancedByDefault = process.env.ENABLE_ENHANCED_TRANSCRIPTION === 'true'
    
    // Check if any enhanced features are explicitly enabled
    const hasEnhancedFeatures = 
      job.options?.enablePreprocessing ||
      job.options?.enableMultiPass ||
      job.options?.enableVocabularyEnhancement ||
      job.options?.enableAccuracyMonitoring ||
      job.options?.multiPassCount !== undefined ||
      job.options?.temperatures !== undefined ||
      job.options?.speakerCount !== undefined ||
      job.options?.contextHints !== undefined ||
      job.options?.minAudioQuality !== undefined ||
      job.options?.minConfidenceScore !== undefined
    
    return enhancedByDefault || hasEnhancedFeatures
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