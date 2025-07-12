import { OpenAI } from 'openai'
import { Readable, Transform } from 'stream'
import { getWebSocketManager } from './websocket-manager'

interface AudioBuffer {
  userId: string
  timestamp: number
  chunk: Buffer
}

interface TranscriptionSegment {
  text: string
  speaker: string
  startTime: number
  endTime: number
  confidence: number
  language: string
}

interface SpeakerProfile {
  id: string
  userId?: string
  voiceSignature: Float32Array
  lastSeen: number
}

// Audio processing constants
const SAMPLE_RATE = 16000
const CHUNK_DURATION_MS = 100 // 100ms chunks for low latency
const OVERLAP_MS = 20 // 20ms overlap between chunks
const MIN_SPEECH_DURATION_MS = 200 // Minimum speech duration to process
const SILENCE_THRESHOLD = 0.01
const BUFFER_SIZE_MS = 500 // Buffer 500ms of audio for context

export class StreamingTranscriptionService {
  private openai: OpenAI
  private audioBuffers: Map<string, AudioBuffer[]> = new Map()
  private speakers: Map<string, SpeakerProfile> = new Map()
  private processingQueue: Map<string, Promise<void>> = new Map()
  private activeStreams: Map<string, Readable> = new Map()
  
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  
  // Process audio chunk directly (for HTTP endpoint)
  public async processAudioChunk(params: {
    meetingId: string
    userId: string
    chunk: Buffer
    timestamp: number
  }): Promise<TranscriptionSegment | null> {
    const { meetingId, userId, chunk, timestamp } = params
    
    try {
      // Check if chunk contains speech
      if (!this.containsSpeech(chunk)) {
        return null
      }
      
      // Get or create speaker profile
      const speaker = await this.identifySpeaker({ userId, timestamp, chunk })
      
      // Create File from buffer for OpenAI API
      const audioBlob = new Blob([chunk], { type: 'audio/wav' })
      const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' })
      
      // Call Whisper API
      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'hu',
        response_format: 'verbose_json',
        prompt: this.getHungarianPrompt(),
        temperature: 0.0,
      })
      
      if (response.text && response.text.trim()) {
        // Create transcription segment
        const segment: TranscriptionSegment = {
          text: this.postProcessHungarian(response.text),
          speaker: speaker.id,
          startTime: timestamp,
          endTime: timestamp + CHUNK_DURATION_MS,
          confidence: this.calculateConfidence(response),
          language: response.language || 'hu',
        }
        
        // Broadcast via WebSocket
        this.handleTranscriptionSegment(meetingId, segment)
        
        // Also save to database for reliability
        await this.saveTranscriptionSegment(meetingId, segment)
        
        return segment
      }
      
      return null
    } catch (error) {
      console.error('Transcription error:', error)
      throw error
    }
  }
  
  // Process incoming audio stream for a meeting
  public async processAudioStream(
    meetingId: string,
    userId: string,
    audioStream: Readable
  ): Promise<void> {
    const streamKey = `${meetingId}-${userId}`
    
    // Store the stream reference
    this.activeStreams.set(streamKey, audioStream)
    
    // Create audio processing pipeline
    const processedStream = audioStream
      .pipe(this.createAudioPreprocessor())
      .pipe(this.createChunkProcessor(meetingId, userId))
      .pipe(this.createTranscriptionProcessor(meetingId))
    
    // Handle stream events
    processedStream.on('data', (segment: TranscriptionSegment) => {
      this.handleTranscriptionSegment(meetingId, segment)
    })
    
    processedStream.on('error', (error) => {
      console.error(`Stream error for ${streamKey}:`, error)
      this.cleanupStream(streamKey)
    })
    
    processedStream.on('end', () => {
      console.log(`Stream ended for ${streamKey}`)
      this.cleanupStream(streamKey)
    })
  }
  
  // Create audio preprocessor transform stream
  private createAudioPreprocessor(): Transform {
    return new Transform({
      transform(chunk: Buffer, encoding, callback) {
        try {
          // Convert to 16kHz mono if needed
          const processed = this.preprocessAudio(chunk)
          
          // Apply noise reduction
          const denoised = this.reduceNoise(processed)
          
          // Normalize audio levels
          const normalized = this.normalizeAudio(denoised)
          
          callback(null, normalized)
        } catch (error) {
          callback(error as Error)
        }
      },
      
      preprocessAudio(chunk: Buffer): Buffer {
        // Convert to PCM 16-bit mono 16kHz
        // This is a simplified version - in production you'd use a proper audio library
        return chunk
      },
      
      reduceNoise(chunk: Buffer): Buffer {
        // Apply spectral subtraction for noise reduction
        // Simplified implementation
        const samples = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2)
        const filtered = new Int16Array(samples.length)
        
        // Simple high-pass filter to remove low-frequency noise
        let prev = 0
        for (let i = 0; i < samples.length; i++) {
          filtered[i] = samples[i] - prev * 0.95
          prev = samples[i]
        }
        
        return Buffer.from(filtered.buffer)
      },
      
      normalizeAudio(chunk: Buffer): Buffer {
        const samples = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2)
        
        // Find peak amplitude
        let peak = 0
        for (const sample of samples) {
          peak = Math.max(peak, Math.abs(sample))
        }
        
        // Normalize to 80% of maximum to avoid clipping
        if (peak > 0) {
          const scale = (32767 * 0.8) / peak
          for (let i = 0; i < samples.length; i++) {
            samples[i] = Math.round(samples[i] * scale)
          }
        }
        
        return Buffer.from(samples.buffer)
      }
    })
  }
  
  // Create chunk processor for buffering and overlap
  private createChunkProcessor(meetingId: string, userId: string): Transform {
    let buffer: Buffer = Buffer.alloc(0)
    let lastChunkTime = Date.now()
    
    return new Transform({
      transform(chunk: Buffer, encoding, callback) {
        // Add to buffer
        buffer = Buffer.concat([buffer, chunk])
        
        // Process chunks with overlap
        const chunkSize = Math.floor((CHUNK_DURATION_MS * SAMPLE_RATE * 2) / 1000)
        const overlapSize = Math.floor((OVERLAP_MS * SAMPLE_RATE * 2) / 1000)
        
        while (buffer.length >= chunkSize) {
          const audioChunk = buffer.slice(0, chunkSize)
          const timestamp = lastChunkTime
          
          // Emit chunk for processing
          this.push({
            userId,
            timestamp,
            chunk: audioChunk,
            meetingId,
          })
          
          // Move buffer with overlap
          buffer = buffer.slice(chunkSize - overlapSize)
          lastChunkTime += CHUNK_DURATION_MS - OVERLAP_MS
        }
        
        callback()
      },
      
      flush(callback) {
        // Process remaining buffer
        if (buffer.length > 0) {
          this.push({
            userId,
            timestamp: lastChunkTime,
            chunk: buffer,
            meetingId,
          })
        }
        callback()
      }
    })
  }
  
  // Create transcription processor
  private createTranscriptionProcessor(meetingId: string): Transform {
    const pendingChunks: AudioBuffer[] = []
    let processingPromise: Promise<void> | null = null
    
    return new Transform({
      objectMode: true,
      
      async transform(audioBuffer: AudioBuffer, encoding, callback) {
        pendingChunks.push(audioBuffer)
        
        // Process in batches for efficiency
        if (!processingPromise) {
          processingPromise = this.processBatch()
        }
        
        callback()
      },
      
      async processBatch(): Promise<void> {
        while (pendingChunks.length > 0) {
          const batch = pendingChunks.splice(0, 10) // Process up to 10 chunks at once
          
          try {
            await Promise.all(
              batch.map(buffer => this.transcribeChunk(meetingId, buffer))
            )
          } catch (error) {
            console.error('Batch transcription error:', error)
          }
        }
        
        processingPromise = null
      }
    })
  }
  
  // Transcribe individual audio chunk
  private async transcribeChunk(
    meetingId: string,
    audioBuffer: AudioBuffer
  ): Promise<void> {
    try {
      // Check if chunk contains speech
      if (!this.containsSpeech(audioBuffer.chunk)) {
        return
      }
      
      // Get or create speaker profile
      const speaker = await this.identifySpeaker(audioBuffer)
      
      // Create audio file from buffer
      const audioBlob = new Blob([audioBuffer.chunk], { type: 'audio/wav' })
      const audioFile = new File([audioBlob], 'audio.wav', { type: 'audio/wav' })
      
      // Call Whisper API with streaming response
      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'hu',
        response_format: 'verbose_json',
        prompt: this.getHungarianPrompt(),
        temperature: 0.0, // Lower temperature for more consistent results
      })
      
      if (response.text && response.text.trim()) {
        // Create transcription segment
        const segment: TranscriptionSegment = {
          text: response.text,
          speaker: speaker.id,
          startTime: audioBuffer.timestamp,
          endTime: audioBuffer.timestamp + CHUNK_DURATION_MS,
          confidence: this.calculateConfidence(response),
          language: response.language || 'hu',
        }
        
        // Apply post-processing for Hungarian
        segment.text = this.postProcessHungarian(segment.text)
        
        // Emit transcription
        this.handleTranscriptionSegment(meetingId, segment)
      }
    } catch (error) {
      console.error('Transcription error:', error)
    }
  }
  
  // Check if audio chunk contains speech
  private containsSpeech(chunk: Buffer): boolean {
    const samples = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2)
    
    // Calculate RMS (Root Mean Square) energy
    let sum = 0
    for (const sample of samples) {
      sum += sample * sample
    }
    const rms = Math.sqrt(sum / samples.length) / 32768
    
    // Check if energy exceeds silence threshold
    return rms > SILENCE_THRESHOLD
  }
  
  // Identify speaker using voice characteristics
  private async identifySpeaker(audioBuffer: AudioBuffer): Promise<SpeakerProfile> {
    // Extract voice signature (simplified - in production use proper speaker diarization)
    const voiceSignature = this.extractVoiceSignature(audioBuffer.chunk)
    
    // Find matching speaker
    let bestMatch: SpeakerProfile | null = null
    let bestScore = 0
    
    for (const speaker of this.speakers.values()) {
      const score = this.compareVoiceSignatures(voiceSignature, speaker.voiceSignature)
      if (score > 0.8 && score > bestScore) {
        bestMatch = speaker
        bestScore = score
      }
    }
    
    if (bestMatch) {
      bestMatch.lastSeen = Date.now()
      return bestMatch
    }
    
    // Create new speaker profile
    const newSpeaker: SpeakerProfile = {
      id: `speaker-${this.speakers.size + 1}`,
      userId: audioBuffer.userId,
      voiceSignature,
      lastSeen: Date.now(),
    }
    
    this.speakers.set(newSpeaker.id, newSpeaker)
    return newSpeaker
  }
  
  // Extract voice signature from audio
  private extractVoiceSignature(chunk: Buffer): Float32Array {
    // Simplified implementation - extract MFCC features
    // In production, use a proper audio feature extraction library
    const samples = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.length / 2)
    const signature = new Float32Array(13) // 13 MFCC coefficients
    
    // Simple spectral analysis
    for (let i = 0; i < 13; i++) {
      let sum = 0
      const start = Math.floor((i * samples.length) / 13)
      const end = Math.floor(((i + 1) * samples.length) / 13)
      
      for (let j = start; j < end; j++) {
        sum += Math.abs(samples[j])
      }
      
      signature[i] = sum / (end - start)
    }
    
    return signature
  }
  
  // Compare voice signatures
  private compareVoiceSignatures(sig1: Float32Array, sig2: Float32Array): number {
    // Cosine similarity
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    for (let i = 0; i < sig1.length; i++) {
      dotProduct += sig1[i] * sig2[i]
      norm1 += sig1[i] * sig1[i]
      norm2 += sig2[i] * sig2[i]
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }
  
  // Calculate transcription confidence
  private calculateConfidence(response: any): number {
    // Whisper doesn't directly provide confidence scores
    // Estimate based on response characteristics
    if (!response.segments || response.segments.length === 0) {
      return 0.5
    }
    
    // Calculate average no_speech_prob inverse as confidence
    let totalConfidence = 0
    for (const segment of response.segments) {
      totalConfidence += 1 - (segment.no_speech_prob || 0)
    }
    
    return totalConfidence / response.segments.length
  }
  
  // Get Hungarian-specific prompt for better accuracy
  private getHungarianPrompt(): string {
    return `
      Magyar nyelvű üzleti megbeszélés átírása.
      Gyakori kifejezések: projekt, meeting, deadline, budget, stakeholder,
      milestone, delivery, sprint, scrum, agile, KPI, OKR, ROI,
      CEO, CTO, CFO, COO, HR, IT, R&D, B2B, B2C.
      Magyar rövidítések: Kft., Zrt., Bt., Nyrt., GDPR, ÁFA, SZJA.
      Gyakori magyar nevek: László, István, János, Péter, Gábor, András,
      Katalin, Erzsébet, Mária, Anna, Eszter, Zsuzsa.
    `.trim()
  }
  
  // Post-process Hungarian transcription
  private postProcessHungarian(text: string): string {
    // Apply common corrections
    const corrections: Record<string, string> = {
      'meting': 'meeting',
      'dedlájn': 'deadline',
      'bádzset': 'budget',
      'stek holder': 'stakeholder',
      'májlsztón': 'milestone',
      'deliveri': 'delivery',
      'szprint': 'sprint',
      'szkrám': 'scrum',
      'edzsájl': 'agile',
      'kft': 'Kft.',
      'zrt': 'Zrt.',
      'bt': 'Bt.',
      'nyrt': 'Nyrt.',
    }
    
    let processed = text
    
    // Apply corrections with word boundaries
    for (const [wrong, correct] of Object.entries(corrections)) {
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi')
      processed = processed.replace(regex, correct)
    }
    
    // Fix common Hungarian grammatical issues
    processed = processed
      .replace(/\baz mond\b/gi, 'azt mond')
      .replace(/\bas szerint\b/gi, 'az szerint')
      .replace(/\ba az\b/gi, 'az')
      .replace(/\s+([.,!?;:])/g, '$1')
      .replace(/\s+/g, ' ')
      .trim()
    
    return processed
  }
  
  // Handle transcription segment
  private handleTranscriptionSegment(meetingId: string, segment: TranscriptionSegment) {
    const wsManager = getWebSocketManager()
    
    // Broadcast to meeting participants
    wsManager.broadcastTranscription({
      id: `${meetingId}-${Date.now()}-${Math.random()}`,
      meetingId,
      text: segment.text,
      speaker: segment.speaker,
      timestamp: segment.startTime,
      confidence: segment.confidence,
      isFinal: true, // Streaming chunks are always final
    })
  }
  
  // Cleanup stream resources
  private cleanupStream(streamKey: string) {
    const stream = this.activeStreams.get(streamKey)
    if (stream) {
      stream.destroy()
      this.activeStreams.delete(streamKey)
    }
    
    // Clean up associated buffers
    const [meetingId] = streamKey.split('-')
    this.audioBuffers.delete(meetingId)
  }
  
  // Save transcription segment to database
  private async saveTranscriptionSegment(
    meetingId: string,
    segment: TranscriptionSegment
  ): Promise<void> {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      
      const { error } = await supabase
        .from('meeting_transcripts')
        .insert({
          meeting_id: meetingId,
          text: segment.text,
          speaker: segment.speaker,
          start_time: segment.startTime,
          end_time: segment.endTime,
          confidence: segment.confidence,
          language: segment.language,
          created_at: new Date().toISOString(),
        })
      
      if (error) {
        console.error('Failed to save transcript segment:', error)
      }
    } catch (error) {
      console.error('Database error:', error)
    }
  }
  
  // Stop transcription for a meeting
  public stopTranscription(meetingId: string) {
    // Clean up all streams for the meeting
    for (const [key, stream] of this.activeStreams.entries()) {
      if (key.startsWith(meetingId)) {
        this.cleanupStream(key)
      }
    }
    
    // Clear speaker profiles for the meeting
    // In production, you might want to save these for future reference
    this.speakers.clear()
  }
}

// Singleton instance
let transcriptionService: StreamingTranscriptionService | null = null

export function getStreamingTranscriptionService(): StreamingTranscriptionService {
  if (!transcriptionService) {
    transcriptionService = new StreamingTranscriptionService()
  }
  return transcriptionService
}