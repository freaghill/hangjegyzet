import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface TranscriptionOptions {
  startTime?: number  // Start transcription from this time (seconds)
  endTime?: number    // End transcription at this time (seconds)
  language?: string   // Language code (default: 'hu')
  prompt?: string     // Custom vocabulary/context
}

export interface TranscriptionResult {
  text: string
  segments: Array<{
    id: number
    start: number
    end: number
    text: string
  }>
  duration: number
  language: string
}

export class WhisperTranscriber {
  private readonly hungarianBusinessTerms = [
    'ÁFA', 'áfa', 'Kft', 'Zrt', 'Bt', 'KATA', 'KIVA',
    'számla', 'szerződés', 'megrendelés', 'ajánlat',
    'határidő', 'teljesítés', 'fizetési feltétel',
    'közbeszerzés', 'pályázat', 'tender',
    'MNB', 'NAV', 'NEAK', 'forint', 'HUF',
    'ügyvezető', 'cégvezető', 'tulajdonos',
    'mérleg', 'eredménykimutatás', 'cash flow',
    'jegyzőkönyv', 'határozat', 'döntés'
  ].join(', ')

  /**
   * Transcribe audio file with time range support
   */
  async transcribe(
    fileUrl: string,
    meetingId: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      // Update meeting status
      const supabase = await createClient()
      await supabase
        .from('meetings')
        .update({ status: 'processing' })
        .eq('id', meetingId)

      // Download file from Supabase
      const audioBuffer = await this.downloadAudio(fileUrl)
      
      // Process audio with time range if specified
      const processedAudio = await this.processTimeRange(
        audioBuffer,
        options.startTime,
        options.endTime
      )

      // Create a File object for OpenAI
      const audioFile = new File(
        [processedAudio],
        'audio.mp3',
        { type: 'audio/mpeg' }
      )

      // Prepare Hungarian-optimized prompt
      const prompt = this.buildPrompt(options.prompt)

      // Call Whisper API with verbose response for timestamps
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: options.language || 'hu',
        response_format: 'verbose_json',
        prompt: prompt,
        temperature: 0.2, // Lower temperature for more accurate transcription
      })

      // Process segments to adjust for time range offset
      const segments = this.processSegments(
        transcription.segments || [],
        options.startTime || 0
      )

      // Calculate actual duration
      const duration = segments.length > 0 
        ? segments[segments.length - 1].end 
        : 0

      // Update meeting with results
      await supabase
        .from('meetings')
        .update({
          status: 'completed',
          transcript: {
            text: transcription.text,
            segments: segments,
          },
          duration_seconds: Math.ceil(duration),
          language: transcription.language,
        })
        .eq('id', meetingId)

      // Track usage
      await this.trackUsage(meetingId, duration)

      return {
        text: transcription.text,
        segments: segments,
        duration: duration,
        language: transcription.language,
      }
    } catch (error) {
      console.error('Transcription error:', error)
      
      // Update meeting status to failed
      const supabase = await createClient()
      await supabase
        .from('meetings')
        .update({ 
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Transcription failed'
        })
        .eq('id', meetingId)
      
      throw error
    }
  }

  /**
   * Download audio from Supabase storage
   */
  private async downloadAudio(fileUrl: string): Promise<Buffer> {
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error('Failed to download audio file')
    }
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  /**
   * Process audio with time range using FFmpeg (via API or library)
   */
  private async processTimeRange(
    audioBuffer: Buffer,
    startTime?: number,
    endTime?: number
  ): Promise<Buffer> {
    // If no time range specified, return original
    if (!startTime && !endTime) {
      return audioBuffer
    }

    // TODO: Implement FFmpeg processing
    // For now, we'll use the full audio and filter segments later
    // In production, use ffmpeg.wasm or server-side FFmpeg to actually trim the audio
    
    console.log(`Time range requested: ${startTime || 0}s to ${endTime || 'end'}`)
    return audioBuffer
  }

  /**
   * Build optimized prompt for Hungarian transcription
   */
  private buildPrompt(customPrompt?: string): string {
    const basePrompt = `Hungarian business meeting transcription. Common terms: ${this.hungarianBusinessTerms}.`
    
    if (customPrompt) {
      return `${basePrompt} Additional context: ${customPrompt}`
    }
    
    return basePrompt
  }

  /**
   * Process segments with time offset adjustment
   */
  private processSegments(
    segments: Array<{ start: number; end: number; text: string }>,
    timeOffset: number
  ): TranscriptionResult['segments'] {
    return segments.map((segment, index) => ({
      id: index,
      start: segment.start + timeOffset,
      end: segment.end + timeOffset,
      text: segment.text.trim(),
    }))
  }

  /**
   * Track usage for billing
   */
  private async trackUsage(meetingId: string, durationSeconds: number): Promise<void> {
    const supabase = await createClient()
    
    // Get meeting's organization
    const { data: meeting } = await supabase
      .from('meetings')
      .select('organization_id')
      .eq('id', meetingId)
      .single()
    
    if (!meeting) return

    // Increment usage
    const minutes = Math.ceil(durationSeconds / 60)
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
    
    // Use the increment_usage function we defined in the schema
    await supabase.rpc('increment_usage', {
      org_id: meeting.organization_id,
      month: currentMonth,
      minutes: minutes,
    })
  }

  /**
   * Extract audio from video file
   */
  async extractAudioFromVideo(videoUrl: string): Promise<string> {
    // TODO: Implement video to audio extraction
    // For now, Whisper can handle video files directly
    return videoUrl
  }

  /**
   * Detect speakers in audio (diarization)
   */
  async detectSpeakers(
    audioUrl: string,
    segments: TranscriptionResult['segments']
  ): Promise<string[]> {
    // TODO: Implement speaker diarization
    // Options: pyannote, AssemblyAI, or custom solution
    
    // For now, return placeholder
    return ['Speaker 1', 'Speaker 2']
  }
}

// Export singleton instance
export const whisperTranscriber = new WhisperTranscriber()