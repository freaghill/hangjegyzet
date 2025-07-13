import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import { Queue, Job } from 'bullmq'
import { QUEUE_NAMES, redisConnection } from '@/lib/queue/config'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export type TranscriptionMode = 'fast' | 'balanced' | 'precision'
export type SupportedLanguage = 'hu' | 'en'

interface TranscriptionConfig {
  mode: TranscriptionMode
  language: SupportedLanguage
  temperature: number
  prompt?: string
  enableTimestamps: boolean
  enableSpeakerDiarization: boolean
  maxRetries: number
  chunkSize: number // For long audio files
}

interface TranscriptionSegment {
  id: number
  text: string
  start: number
  end: number
  speaker?: string
  confidence?: number
}

interface TranscriptionResult {
  text: string
  segments: TranscriptionSegment[]
  language: string
  duration: number
  mode: TranscriptionMode
  wordCount: number
  processingTime: number
}

export class WhisperService {
  private queue: Queue
  
  // Mode configurations
  private readonly modeConfigs: Record<TranscriptionMode, Partial<TranscriptionConfig>> = {
    fast: {
      temperature: 0.3,
      enableTimestamps: true,
      enableSpeakerDiarization: false,
      maxRetries: 2,
      chunkSize: 600, // 10 minutes
    },
    balanced: {
      temperature: 0.2,
      enableTimestamps: true,
      enableSpeakerDiarization: true,
      maxRetries: 3,
      chunkSize: 300, // 5 minutes
    },
    precision: {
      temperature: 0.0,
      enableTimestamps: true,
      enableSpeakerDiarization: true,
      maxRetries: 5,
      chunkSize: 180, // 3 minutes
    }
  }

  // Language-specific prompts
  private readonly languagePrompts: Record<SupportedLanguage, string> = {
    hu: `Ez egy magyar nyelvű üzleti megbeszélés. Gyakori kifejezések: ÁFA, Kft, Zrt, Bt, KATA, KIVA, 
számla, szerződés, megrendelés, ajánlat, határidő, teljesítés, fizetési feltétel, 
közbeszerzés, pályázat, tender, MNB, NAV, NEAK, forint, HUF, ügyvezető, cégvezető, 
tulajdonos, mérleg, eredménykimutatás, cash flow, jegyzőkönyv, határozat, döntés.`,
    en: `This is a business meeting recording. Common terms: invoice, contract, order, 
proposal, deadline, delivery, payment terms, tender, budget, revenue, profit, 
cash flow, minutes, decision, action items.`
  }

  constructor() {
    this.queue = new Queue(QUEUE_NAMES.TRANSCRIPTION, {
      connection: redisConnection,
    })
  }

  /**
   * Queue a transcription job
   */
  async queueTranscription(
    meetingId: string,
    audioFileUrl: string,
    config: Partial<TranscriptionConfig> = {}
  ): Promise<string> {
    const job = await this.queue.add('transcribe', {
      meetingId,
      audioFileUrl,
      config: {
        mode: 'balanced',
        language: 'hu',
        ...config
      }
    }, {
      attempts: config.maxRetries || 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // 1 hour
        count: 100,
      },
      removeOnFail: {
        age: 86400, // 24 hours
      },
    })

    return job.id!
  }

  /**
   * Process transcription with progress updates
   */
  async processTranscription(
    job: Job,
    audioFileUrl: string,
    meetingId: string,
    config: TranscriptionConfig
  ): Promise<TranscriptionResult> {
    const startTime = Date.now()
    
    try {
      // Update meeting status
      await this.updateMeetingStatus(meetingId, 'processing', 0)
      
      // Download audio file
      await job.updateProgress(10)
      const audioBuffer = await this.downloadAudio(audioFileUrl)
      
      // Get audio duration
      const duration = await this.getAudioDuration(audioBuffer)
      
      // Determine if we need to chunk the audio
      const needsChunking = duration > config.chunkSize
      
      if (needsChunking && config.mode !== 'fast') {
        // Process in chunks for better accuracy
        return await this.processChunkedTranscription(
          job, 
          audioBuffer, 
          meetingId, 
          config, 
          duration
        )
      } else {
        // Process entire file at once
        return await this.processSingleTranscription(
          job, 
          audioBuffer, 
          meetingId, 
          config, 
          duration
        )
      }
    } catch (error) {
      await this.updateMeetingStatus(meetingId, 'failed', 0, error)
      throw error
    }
  }

  /**
   * Process audio in a single pass
   */
  private async processSingleTranscription(
    job: Job,
    audioBuffer: Buffer,
    meetingId: string,
    config: TranscriptionConfig,
    duration: number
  ): Promise<TranscriptionResult> {
    await job.updateProgress(20)
    
    // Create File object for OpenAI
    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' })
    
    // Build prompt
    const prompt = this.buildPrompt(config.language, config.prompt)
    
    // Call Whisper API
    await job.updateProgress(30)
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: config.language,
      response_format: config.enableTimestamps ? 'verbose_json' : 'json',
      temperature: config.temperature,
      prompt,
    })
    
    await job.updateProgress(70)
    
    // Process segments
    const segments = this.processSegments(transcription as any)
    
    // Apply speaker diarization if enabled
    if (config.enableSpeakerDiarization && config.mode !== 'fast') {
      await job.updateProgress(80)
      await this.applySpeakerDiarization(segments, audioBuffer)
    }
    
    await job.updateProgress(90)
    
    // Calculate metrics
    const wordCount = transcription.text.split(/\s+/).length
    const processingTime = Date.now() - job.timestamp
    
    const result: TranscriptionResult = {
      text: transcription.text,
      segments,
      language: config.language,
      duration,
      mode: config.mode,
      wordCount,
      processingTime,
    }
    
    // Save to database
    await this.saveTranscription(meetingId, result)
    await job.updateProgress(100)
    
    return result
  }

  /**
   * Process audio in chunks for better accuracy
   */
  private async processChunkedTranscription(
    job: Job,
    audioBuffer: Buffer,
    meetingId: string,
    config: TranscriptionConfig,
    duration: number
  ): Promise<TranscriptionResult> {
    const chunks = Math.ceil(duration / config.chunkSize)
    const allSegments: TranscriptionSegment[] = []
    let fullText = ''
    
    for (let i = 0; i < chunks; i++) {
      const progress = 20 + (i / chunks) * 60
      await job.updateProgress(progress)
      
      const startTime = i * config.chunkSize
      const endTime = Math.min((i + 1) * config.chunkSize, duration)
      
      // Extract chunk (in production, use ffmpeg)
      const chunkBuffer = await this.extractAudioChunk(
        audioBuffer, 
        startTime, 
        endTime
      )
      
      const chunkFile = new File([chunkBuffer], `chunk_${i}.mp3`, { type: 'audio/mpeg' })
      
      // Transcribe chunk with context from previous chunk
      const previousContext = i > 0 ? fullText.slice(-200) : ''
      const prompt = this.buildPrompt(config.language, config.prompt, previousContext)
      
      const chunkTranscription = await openai.audio.transcriptions.create({
        file: chunkFile,
        model: 'whisper-1',
        language: config.language,
        response_format: 'verbose_json',
        temperature: config.temperature,
        prompt,
      })
      
      // Process and adjust segment timestamps
      const chunkSegments = this.processSegments(
        chunkTranscription as any, 
        startTime
      )
      
      allSegments.push(...chunkSegments)
      fullText += ' ' + chunkTranscription.text
    }
    
    await job.updateProgress(80)
    
    // Apply post-processing
    if (config.mode === 'precision') {
      await this.applyPrecisionEnhancements(allSegments, fullText)
    }
    
    // Apply speaker diarization
    if (config.enableSpeakerDiarization) {
      await job.updateProgress(85)
      await this.applySpeakerDiarization(allSegments, audioBuffer)
    }
    
    await job.updateProgress(95)
    
    const result: TranscriptionResult = {
      text: fullText.trim(),
      segments: allSegments,
      language: config.language,
      duration,
      mode: config.mode,
      wordCount: fullText.split(/\s+/).length,
      processingTime: Date.now() - job.timestamp,
    }
    
    await this.saveTranscription(meetingId, result)
    await job.updateProgress(100)
    
    return result
  }

  /**
   * Build optimized prompt based on language and context
   */
  private buildPrompt(
    language: SupportedLanguage, 
    customPrompt?: string,
    previousContext?: string
  ): string {
    let prompt = this.languagePrompts[language]
    
    if (previousContext) {
      prompt = `Előző kontextus: "${previousContext}"\n\n${prompt}`
    }
    
    if (customPrompt) {
      prompt += `\n\nTovábbi információ: ${customPrompt}`
    }
    
    return prompt
  }

  /**
   * Process transcription segments
   */
  private processSegments(
    transcription: any,
    timeOffset: number = 0
  ): TranscriptionSegment[] {
    if (!transcription.segments) {
      return [{
        id: 0,
        text: transcription.text,
        start: 0,
        end: transcription.duration || 0,
      }]
    }
    
    return transcription.segments.map((seg: any, index: number) => ({
      id: index,
      text: seg.text.trim(),
      start: seg.start + timeOffset,
      end: seg.end + timeOffset,
      confidence: seg.confidence,
    }))
  }

  /**
   * Apply speaker diarization using external service or heuristics
   */
  private async applySpeakerDiarization(
    segments: TranscriptionSegment[],
    audioBuffer: Buffer
  ): Promise<void> {
    // In production, integrate with pyannote or similar service
    // For now, apply simple heuristics based on pauses
    
    let currentSpeaker = 'Speaker 1'
    let speakerCount = 1
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      
      // Check for speaker change indicators
      if (i > 0) {
        const prevSegment = segments[i - 1]
        const pause = segment.start - prevSegment.end
        
        // Long pause might indicate speaker change
        if (pause > 2.0) {
          speakerCount++
          currentSpeaker = `Speaker ${(speakerCount % 2) + 1}`
        }
      }
      
      segment.speaker = currentSpeaker
    }
  }

  /**
   * Apply precision mode enhancements
   */
  private async applyPrecisionEnhancements(
    segments: TranscriptionSegment[],
    fullText: string
  ): Promise<void> {
    // In precision mode, we can:
    // 1. Apply grammar correction
    // 2. Fix common transcription errors
    // 3. Improve punctuation
    
    // For Hungarian text, fix common issues
    if (fullText.includes('hu')) {
      segments.forEach(segment => {
        // Fix common Hungarian transcription errors
        segment.text = segment.text
          .replace(/([aáeéiíoóöőuúüű])\s+([aáeéiíoóöőuúüű])/gi, '$1$2') // Fix split vowels
          .replace(/\b(kft|zrt|bt)\b/gi, (match) => match.toUpperCase() + '.') // Fix company types
      })
    }
  }

  /**
   * Download audio from URL
   */
  private async downloadAudio(url: string): Promise<Buffer> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`)
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Get audio duration (simplified - in production use ffprobe)
   */
  private async getAudioDuration(audioBuffer: Buffer): Promise<number> {
    // This is a simplified implementation
    // In production, use ffprobe or similar to get accurate duration
    return 300 // Default 5 minutes for now
  }

  /**
   * Extract audio chunk (simplified - in production use ffmpeg)
   */
  private async extractAudioChunk(
    audioBuffer: Buffer,
    startTime: number,
    endTime: number
  ): Promise<Buffer> {
    // In production, use ffmpeg to extract the actual chunk
    // For now, return the full buffer
    return audioBuffer
  }

  /**
   * Update meeting status in database
   */
  private async updateMeetingStatus(
    meetingId: string,
    status: string,
    progress: number,
    error?: any
  ): Promise<void> {
    const supabase = await createClient()
    
    const updateData: any = {
      status,
      transcription_progress: progress,
    }
    
    if (error) {
      updateData.error_message = error instanceof Error ? error.message : 'Unknown error'
    }
    
    await supabase
      .from('meetings')
      .update(updateData)
      .eq('id', meetingId)
  }

  /**
   * Save transcription to database
   */
  private async saveTranscription(
    meetingId: string,
    result: TranscriptionResult
  ): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('meetings')
      .update({
        status: 'transcribed',
        transcript: {
          text: result.text,
          segments: result.segments,
          language: result.language,
          duration: result.duration,
          wordCount: result.wordCount,
        },
        processing_mode: result.mode,
        processed_at: new Date().toISOString(),
        transcription_progress: 100,
      })
      .eq('id', meetingId)
  }

  /**
   * Get transcription job status
   */
  async getJobStatus(jobId: string): Promise<{
    status: string
    progress: number
    result?: TranscriptionResult
    error?: string
  }> {
    const job = await this.queue.getJob(jobId)
    
    if (!job) {
      throw new Error('Job not found')
    }
    
    return {
      status: await job.getState(),
      progress: job.progress as number || 0,
      result: job.returnvalue as TranscriptionResult,
      error: job.failedReason,
    }
  }

  /**
   * Cancel a transcription job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId)
    if (job && ['waiting', 'active'].includes(await job.getState())) {
      await job.remove()
    }
  }
}

export const whisperService = new WhisperService()