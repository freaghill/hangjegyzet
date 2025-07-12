import { createClient } from '@/lib/supabase/server'
import { audioPreprocessor } from './audio-preprocessor'
import { multiPassTranscriber, MultiPassOptions } from './multi-pass-transcriber'
import { accuracyMonitor, AccuracyMetrics } from './accuracy-monitor'
import { VocabularyEnhancedTranscription } from './vocabulary-enhanced'

export interface EnhancedTranscriptionOptions {
  organizationId: string
  meetingId: string
  fileUrl: string
  userId: string
  
  // Time range options
  startTime?: number
  endTime?: number
  
  // Processing options
  language?: string
  enablePreprocessing?: boolean
  enableMultiPass?: boolean
  enableVocabularyEnhancement?: boolean
  enableAccuracyMonitoring?: boolean
  enableParallelProcessing?: boolean
  
  // Advanced options
  multiPassCount?: number
  temperatures?: number[]
  speakerCount?: number
  customVocabulary?: string[]
  contextHints?: string[]
  
  // Quality thresholds
  minAudioQuality?: 'poor' | 'fair' | 'good' | 'excellent'
  minConfidenceScore?: number
}

export interface EnhancedTranscriptionResult {
  success: boolean
  transcript: {
    text: string
    segments: Array<{
      id: number
      start: number
      end: number
      text: string
      speaker?: string
      confidence?: number
    }>
  }
  metadata: {
    duration: number
    language: string
    audioQuality: string
    processingTime: number
    enhancementsApplied: string[]
    vocabularyMatches: number
    confidence: number
    passCount?: number
  }
  warnings?: string[]
  error?: string
}

export class EnhancedTranscriptionProcessor {
  private vocabularyEnhancer: VocabularyEnhancedTranscription
  
  constructor() {
    this.vocabularyEnhancer = new VocabularyEnhancedTranscription()
  }

  /**
   * Main processing pipeline with all enhancements
   */
  async process(options: EnhancedTranscriptionOptions): Promise<EnhancedTranscriptionResult> {
    const startTime = Date.now()
    const enhancementsApplied: string[] = []
    const warnings: string[] = []
    
    const supabase = await createClient()
    
    try {
      // Update meeting status
      await supabase
        .from('meetings')
        .update({ 
          status: 'processing',
          metadata: {
            processingStarted: new Date().toISOString(),
            enhancedProcessing: true
          }
        })
        .eq('id', options.meetingId)

      // Step 1: Download audio
      console.log('Downloading audio file...')
      const audioBuffer = await this.downloadAudio(options.fileUrl)

      // Step 2: Audio preprocessing
      let processedBuffer = audioBuffer
      let preprocessingResult = null
      
      if (options.enablePreprocessing !== false) {
        console.log('Preprocessing audio...')
        preprocessingResult = await audioPreprocessor.preprocess(audioBuffer, {
          noiseReduction: true,
          normalize: true,
          detectVoiceActivity: true,
          enhanceQuality: true
        })
        
        processedBuffer = preprocessingResult.processedAudioBuffer
        enhancementsApplied.push('audio_preprocessing')
        
        // Check audio quality
        if (preprocessingResult.qualityMetrics.quality === 'poor') {
          warnings.push('Audio quality is poor. Results may be less accurate.')
          
          // Apply additional enhancement for poor quality
          if (preprocessingResult.needsEnhancement) {
            console.log('Applying additional audio enhancement...')
            processedBuffer = await audioPreprocessor.enhanceAudio(processedBuffer)
            enhancementsApplied.push('audio_enhancement')
          }
        }
        
        // Check minimum quality threshold
        if (options.minAudioQuality) {
          const qualityLevels = ['poor', 'fair', 'good', 'excellent']
          const currentLevel = qualityLevels.indexOf(preprocessingResult.qualityMetrics.quality)
          const minLevel = qualityLevels.indexOf(options.minAudioQuality)
          
          if (currentLevel < minLevel) {
            warnings.push(`Audio quality (${preprocessingResult.qualityMetrics.quality}) is below minimum threshold (${options.minAudioQuality})`)
          }
        }
      }

      // Step 3: Multi-pass transcription or single pass
      let transcriptionResult
      
      if (options.enableMultiPass !== false && options.multiPassCount && options.multiPassCount > 1) {
        console.log(`Performing ${options.multiPassCount}-pass transcription...`)
        
        const multiPassOptions: MultiPassOptions = {
          organizationId: options.organizationId,
          language: options.language,
          passes: options.multiPassCount || 2,
          temperatures: options.temperatures || [0.0, 0.2],
          useEnhancedPostProcessing: true,
          customVocabulary: options.customVocabulary,
          contextHints: options.contextHints,
          speakerCount: options.speakerCount
        }
        
        transcriptionResult = await multiPassTranscriber.transcribe(
          processedBuffer,
          multiPassOptions
        )
        
        enhancementsApplied.push('multi_pass_transcription')
        if (transcriptionResult.postProcessingApplied) {
          enhancementsApplied.push('claude_enhancement')
        }
      } else {
        // Single pass transcription with parallel processing
        console.log('Performing single-pass transcription...')
        
        if (options.enableParallelProcessing && preprocessingResult && preprocessingResult.processedDuration > 300) {
          // Use parallel processing for files longer than 5 minutes
          const { parallelProcessor } = await import('./parallel-processor')
          transcriptionResult = await parallelProcessor.process(
            options.fileUrl,
            options.meetingId,
            {
              startTime: options.startTime,
              endTime: options.endTime,
              language: options.language,
              prompt: this.buildPrompt(options)
            }
          )
          enhancementsApplied.push('parallel_processing')
        } else {
          // Use standard Whisper transcriber
          const { whisperTranscriber } = await import('./whisper')
          const result = await whisperTranscriber.transcribe(
            options.fileUrl,
            options.meetingId,
            {
              startTime: options.startTime,
              endTime: options.endTime,
              language: options.language,
              prompt: this.buildPrompt(options)
            }
          )
          
          transcriptionResult = {
            finalText: result.text,
            finalSegments: result.segments,
            duration: result.duration,
            vocabularyMatches: 0
          }
        }
      }

      // Step 4: Vocabulary enhancement
      let finalText = transcriptionResult.finalText || transcriptionResult.text
      let finalSegments = transcriptionResult.finalSegments || transcriptionResult.segments
      
      if (options.enableVocabularyEnhancement !== false) {
        console.log('Applying vocabulary enhancement...')
        
        finalText = await this.vocabularyEnhancer.enhanceTranscription(
          finalText,
          options.organizationId,
          options.language || 'hu'
        )
        
        // Apply enhancement to segments as well
        for (const segment of finalSegments) {
          segment.text = await this.vocabularyEnhancer.enhanceTranscription(
            segment.text,
            options.organizationId,
            options.language || 'hu'
          )
        }
        
        enhancementsApplied.push('vocabulary_enhancement')
      }

      // Step 5: Calculate metrics
      const audioQuality = preprocessingResult?.qualityMetrics.quality || 'unknown'
      const confidence = this.calculateOverallConfidence(
        finalSegments,
        transcriptionResult.passes || [],
        preprocessingResult?.qualityMetrics
      )
      
      // Check confidence threshold
      if (options.minConfidenceScore && confidence < options.minConfidenceScore) {
        warnings.push(`Transcription confidence (${(confidence * 100).toFixed(1)}%) is below minimum threshold (${(options.minConfidenceScore * 100).toFixed(1)}%)`)
      }

      // Step 6: Track accuracy metrics
      if (options.enableAccuracyMonitoring !== false) {
        const metrics: AccuracyMetrics = {
          transcriptionId: `${options.meetingId}_${Date.now()}`,
          organizationId: options.organizationId,
          meetingId: options.meetingId,
          vocabularyMatchRate: transcriptionResult.vocabularyMatches / Math.max(finalText.split(' ').length, 1),
          confidenceScore: confidence,
          audioQuality: audioQuality as any,
          duration: transcriptionResult.duration || preprocessingResult?.processedDuration || 0,
          passCount: transcriptionResult.passes?.length || 1,
          enhancementsApplied: enhancementsApplied.length > 0,
          userCorrections: 0,
          timestamp: new Date()
        }
        
        await accuracyMonitor.trackTranscription(metrics)
        enhancementsApplied.push('accuracy_monitoring')
      }

      // Step 7: Update meeting with results
      const processingTime = (Date.now() - startTime) / 1000
      
      await supabase
        .from('meetings')
        .update({
          status: 'completed',
          transcript: {
            text: finalText,
            segments: finalSegments,
          },
          duration_seconds: Math.ceil(transcriptionResult.duration || 0),
          language: options.language || 'hu',
          metadata: {
            processingTime,
            enhancementsApplied,
            audioQuality,
            confidence,
            warnings,
            vocabularyMatches: transcriptionResult.vocabularyMatches || 0,
            processedAt: new Date().toISOString()
          }
        })
        .eq('id', options.meetingId)

      // Step 8: Track usage
      await this.trackUsage(
        options.meetingId,
        options.organizationId,
        transcriptionResult.duration || 0
      )

      return {
        success: true,
        transcript: {
          text: finalText,
          segments: finalSegments
        },
        metadata: {
          duration: transcriptionResult.duration || 0,
          language: options.language || 'hu',
          audioQuality,
          processingTime,
          enhancementsApplied,
          vocabularyMatches: transcriptionResult.vocabularyMatches || 0,
          confidence,
          passCount: transcriptionResult.passes?.length || 1
        },
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      console.error('Enhanced transcription error:', error)
      
      // Update meeting status to failed
      await supabase
        .from('meetings')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Enhanced transcription failed',
          metadata: {
            processingTime: (Date.now() - startTime) / 1000,
            enhancementsApplied,
            failedAt: new Date().toISOString()
          }
        })
        .eq('id', options.meetingId)
      
      return {
        success: false,
        transcript: {
          text: '',
          segments: []
        },
        metadata: {
          duration: 0,
          language: options.language || 'hu',
          audioQuality: 'unknown',
          processingTime: (Date.now() - startTime) / 1000,
          enhancementsApplied,
          vocabularyMatches: 0,
          confidence: 0
        },
        error: error instanceof Error ? error.message : 'Enhanced transcription failed'
      }
    }
  }

  /**
   * Build prompt with vocabulary and context
   */
  private buildPrompt(options: EnhancedTranscriptionOptions): string {
    const parts: string[] = []
    
    if (options.contextHints && options.contextHints.length > 0) {
      parts.push(`Context: ${options.contextHints.join(', ')}.`)
    }
    
    if (options.customVocabulary && options.customVocabulary.length > 0) {
      parts.push(`Key terms: ${options.customVocabulary.join(', ')}.`)
    }
    
    parts.push('Hungarian business meeting transcription.')
    
    return parts.join(' ')
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    segments: any[],
    passes: any[],
    audioQuality?: any
  ): number {
    let confidence = 0.5 // Base confidence
    
    // Factor 1: Segment confidence
    if (segments.length > 0) {
      const segmentConfidences = segments
        .filter(s => s.confidence !== undefined)
        .map(s => s.confidence)
      
      if (segmentConfidences.length > 0) {
        const avgSegmentConfidence = segmentConfidences.reduce((a, b) => a + b, 0) / segmentConfidences.length
        confidence = avgSegmentConfidence
      }
    }
    
    // Factor 2: Multi-pass agreement
    if (passes.length > 1) {
      const passConfidences = passes.map(p => p.confidence || 0.5)
      const avgPassConfidence = passConfidences.reduce((a, b) => a + b, 0) / passConfidences.length
      confidence = (confidence + avgPassConfidence) / 2
    }
    
    // Factor 3: Audio quality
    if (audioQuality) {
      const qualityBonus = {
        'excellent': 0.1,
        'good': 0.05,
        'fair': 0,
        'poor': -0.1
      }
      confidence += qualityBonus[audioQuality.quality] || 0
    }
    
    return Math.max(0, Math.min(1, confidence))
  }

  /**
   * Download audio from URL
   */
  private async downloadAudio(url: string): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error('Failed to download audio file')
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Track usage for billing
   */
  private async trackUsage(
    meetingId: string,
    organizationId: string,
    durationSeconds: number
  ): Promise<void> {
    const supabase = await createClient()
    
    const minutes = Math.ceil(durationSeconds / 60)
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
    
    await supabase.rpc('increment_usage', {
      org_id: organizationId,
      month: currentMonth,
      minutes: minutes,
    })
  }

  /**
   * Process feedback from user corrections
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
    const supabase = await createClient()
    
    // Get meeting details
    const { data: meeting } = await supabase
      .from('meetings')
      .select('organization_id, transcript')
      .eq('id', meetingId)
      .single()
    
    if (!meeting) return
    
    // Format corrections for accuracy monitor
    const formattedCorrections = corrections.map(corr => ({
      start: corr.startTime || 0,
      end: corr.endTime || 0,
      original: corr.originalText,
      corrected: corr.correctedText,
      type: 'user' as const
    }))
    
    // Record corrections
    await accuracyMonitor.recordCorrection({
      transcriptionId: `${meetingId}_${Date.now()}`,
      originalText: meeting.transcript?.text || '',
      correctedText: meeting.transcript?.text || '', // Will be updated
      corrections: formattedCorrections,
      userId
    })
    
    // Learn from corrections
    await multiPassTranscriber.learnFromResults(
      meeting.organization_id,
      meeting.transcript?.text || '',
      meeting.transcript?.text || '', // Will be updated
      corrections.map(c => ({
        original: c.originalText,
        corrected: c.correctedText
      }))
    )
  }
}

// Export singleton instance
export const enhancedProcessor = new EnhancedTranscriptionProcessor()