import { whisperTranscriber, TranscriptionOptions, TranscriptionResult } from './whisper'
import { createClient } from '@/lib/supabase/server'

interface AudioChunk {
  id: number
  startTime: number
  endTime: number
  buffer: Buffer
  overlap: {
    previous: number
    next: number
  }
}

interface ChunkResult extends TranscriptionResult {
  chunkId: number
  startOffset: number
  endOffset: number
}

export class ParallelTranscriptionProcessor {
  private readonly DEFAULT_CHUNK_DURATION = 180 // 3 minutes
  private readonly OVERLAP_DURATION = 10 // 10 seconds
  private readonly MAX_WORKERS = 10
  
  /**
   * Update progress in database
   */
  private async updateProgress(meetingId: string, completed: number, total: number) {
    const supabase = await createClient()
    const progress = Math.round((completed / total) * 100)
    
    await supabase
      .from('meetings')
      .update({
        metadata: {
          progress: progress,
          chunksCompleted: completed,
          chunksTotal: total,
          updatedAt: new Date().toISOString()
        }
      })
      .eq('id', meetingId)
  }

  /**
   * Process audio file in parallel chunks
   */
  async process(
    fileUrl: string,
    meetingId: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const supabase = await createClient()
    
    try {
      // Update status
      await supabase
        .from('meetings')
        .update({ 
          status: 'processing',
          metadata: { 
            processingMethod: 'parallel',
            startedAt: new Date().toISOString()
          }
        })
        .eq('id', meetingId)

      // Download audio file
      const audioBuffer = await this.downloadAudio(fileUrl)
      
      // Get audio duration (simplified - in production use ffprobe)
      const duration = await this.getAudioDuration(audioBuffer)
      
      // Calculate effective duration with time range
      const startTime = options.startTime || 0
      const endTime = options.endTime || duration
      const effectiveDuration = endTime - startTime

      // Calculate optimal number of chunks
      const numChunks = Math.min(
        this.MAX_WORKERS,
        Math.ceil(effectiveDuration / this.DEFAULT_CHUNK_DURATION)
      )

      console.log(`Processing ${effectiveDuration}s audio in ${numChunks} parallel chunks`)

      // Create chunks with overlap
      const chunks = this.calculateChunks(startTime, endTime, numChunks)
      
      // Update progress
      await this.updateProgress(meetingId, 0, numChunks)

      // Process chunks in parallel
      const startProcessing = Date.now()
      const chunkResults = await this.processChunksInParallel(
        audioBuffer,
        chunks,
        meetingId,
        options
      )

      const processingTime = (Date.now() - startProcessing) / 1000
      const speedup = effectiveDuration / processingTime

      console.log(`Transcription completed in ${processingTime}s (${speedup.toFixed(1)}x realtime)`)

      // Merge results
      const finalResult = this.mergeChunkResults(chunkResults, chunks)

      // Update meeting with results
      await supabase
        .from('meetings')
        .update({
          status: 'completed',
          transcript: {
            text: finalResult.text,
            segments: finalResult.segments,
          },
          duration_seconds: Math.ceil(effectiveDuration),
          metadata: {
            processingTime: processingTime,
            speedup: speedup,
            chunks: numChunks,
          }
        })
        .eq('id', meetingId)

      return finalResult
    } catch (error) {
      console.error('Parallel processing error:', error)
      
      // Fall back to sequential processing
      console.log('Falling back to sequential processing')
      return whisperTranscriber.transcribe(fileUrl, meetingId, options)
    }
  }

  /**
   * Calculate chunk boundaries with overlap
   */
  private calculateChunks(
    startTime: number,
    endTime: number,
    numChunks: number
  ): AudioChunk[] {
    const totalDuration = endTime - startTime
    const baseChunkSize = totalDuration / numChunks
    const chunks: AudioChunk[] = []

    for (let i = 0; i < numChunks; i++) {
      const chunkStart = startTime + (i * baseChunkSize)
      const chunkEnd = i === numChunks - 1 
        ? endTime 
        : startTime + ((i + 1) * baseChunkSize)
      
      // Add overlap to prevent word cutoff
      const overlapPrev = i > 0 ? this.OVERLAP_DURATION : 0
      const overlapNext = i < numChunks - 1 ? this.OVERLAP_DURATION : 0
      
      chunks.push({
        id: i,
        startTime: Math.max(startTime, chunkStart - overlapPrev),
        endTime: Math.min(endTime, chunkEnd + overlapNext),
        buffer: Buffer.alloc(0), // Will be filled later
        overlap: {
          previous: overlapPrev,
          next: overlapNext,
        }
      })
    }

    return chunks
  }

  /**
   * Process chunks in parallel
   */
  private async processChunksInParallel(
    audioBuffer: Buffer,
    chunks: AudioChunk[],
    meetingId: string,
    options: TranscriptionOptions
  ): Promise<ChunkResult[]> {
    const promises = chunks.map(async (chunk, index) => {
      try {
        // In production, use ffmpeg to extract chunk
        // For now, we'll simulate with the full audio
        const chunkBuffer = await this.extractAudioChunk(
          audioBuffer,
          chunk.startTime,
          chunk.endTime
        )

        // Create a temporary file for the chunk
        const chunkFile = new File(
          [chunkBuffer],
          `chunk_${chunk.id}.mp3`,
          { type: 'audio/mpeg' }
        )

        // Process with Whisper
        const result = await this.processChunk(
          chunkFile,
          chunk,
          options
        )

        // Update progress
        await this.updateProgress(meetingId, index + 1, chunks.length)

        return {
          ...result,
          chunkId: chunk.id,
          startOffset: chunk.startTime,
          endOffset: chunk.endTime,
        } as ChunkResult
      } catch (error) {
        console.error(`Chunk ${chunk.id} processing failed:`, error)
        throw error
      }
    })

    return Promise.all(promises)
  }

  /**
   * Process a single chunk
   */
  private async processChunk(
    audioFile: File,
    chunk: AudioChunk,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    // Use OpenAI Whisper API directly for chunks
    const openai = new (await import('openai')).default({
      apiKey: process.env.OPENAI_API_KEY,
    })

    const response = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: options.language || 'hu',
      response_format: 'verbose_json',
      temperature: 0.2,
      prompt: options.prompt,
    })

    // Adjust timestamps for chunk offset
    const segments = (response.segments || []).map((seg: { start: number; end: number; text: string }, idx: number) => ({
      id: idx,
      start: seg.start + chunk.startTime,
      end: seg.end + chunk.startTime,
      text: seg.text.trim(),
    }))

    return {
      text: response.text,
      segments,
      duration: chunk.endTime - chunk.startTime,
      language: response.language,
    }
  }

  /**
   * Merge chunk results intelligently
   */
  private mergeChunkResults(
    results: ChunkResult[],
    chunks: AudioChunk[]
  ): TranscriptionResult {
    // Sort by chunk ID
    const sortedResults = results.sort((a, b) => a.chunkId - b.chunkId)
    
    const mergedSegments: TranscriptionResult['segments'] = []
    const textParts: string[] = []

    for (let i = 0; i < sortedResults.length; i++) {
      const result = sortedResults[i]
      const chunk = chunks[i]
      
      if (i === 0) {
        // First chunk - add all segments
        mergedSegments.push(...result.segments)
        textParts.push(result.text)
      } else {
        // Remove overlapping segments
        const filteredSegments = this.removeOverlappingSegments(
          result.segments,
          mergedSegments,
          chunk.overlap.previous
        )
        
        mergedSegments.push(...filteredSegments)
        
        // For text, try to find overlap point
        const overlapText = this.findTextOverlap(
          textParts[textParts.length - 1],
          result.text
        )
        
        if (overlapText) {
          // Remove overlap from new text
          const newText = result.text.substring(overlapText.length)
          textParts.push(newText)
        } else {
          textParts.push(result.text)
        }
      }
    }

    // Renumber segments
    const finalSegments = mergedSegments.map((seg, idx) => ({
      ...seg,
      id: idx,
    }))

    return {
      text: textParts.join(' '),
      segments: finalSegments,
      duration: chunks[chunks.length - 1].endTime - chunks[0].startTime,
      language: results[0]?.language || 'hu',
    }
  }

  /**
   * Remove overlapping segments from chunk results
   */
  private removeOverlappingSegments(
    newSegments: TranscriptionResult['segments'],
    existingSegments: TranscriptionResult['segments'],
    overlapDuration: number
  ): TranscriptionResult['segments'] {
    if (overlapDuration === 0 || existingSegments.length === 0) {
      return newSegments
    }

    const lastExistingSegment = existingSegments[existingSegments.length - 1]
    const overlapThreshold = lastExistingSegment.end - overlapDuration

    // Filter out segments that are in the overlap region
    return newSegments.filter(segment => segment.start > overlapThreshold)
  }

  /**
   * Find text overlap between chunks
   */
  private findTextOverlap(text1: string, text2: string): string | null {
    const minOverlap = 20 // Minimum characters to consider overlap
    const maxOverlap = 200 // Maximum to check
    
    for (let len = maxOverlap; len >= minOverlap; len--) {
      const tail = text1.slice(-len)
      if (text2.startsWith(tail)) {
        return tail
      }
    }
    
    return null
  }

  /**
   * Update processing progress
   */
  private async updateProgress(
    meetingId: string,
    completed: number,
    total: number
  ): Promise<void> {
    const percentage = Math.round((completed / total) * 100)
    
    const supabase = await createClient()
    await supabase
      .from('meetings')
      .update({
        metadata: {
          processingProgress: percentage,
          chunksCompleted: completed,
          chunksTotal: total,
        }
      })
      .eq('id', meetingId)

    console.log(`Progress: ${completed}/${total} chunks (${percentage}%)`)
  }

  /**
   * Helper methods (simplified - use ffmpeg in production)
   */
  private async downloadAudio(url: string): Promise<Buffer> {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  }

  private async getAudioDuration(buffer: Buffer): Promise<number> {
    // In production, use ffprobe or similar
    // For now, estimate based on file size
    const estimatedBitrate = 128000 // 128 kbps
    const durationSeconds = (buffer.length * 8) / estimatedBitrate
    return durationSeconds
  }

  private async extractAudioChunk(
    buffer: Buffer,
    startTime: number,
    endTime: number
  ): Promise<Buffer> {
    // In production, use ffmpeg to extract chunk
    // For now, return the full buffer
    console.log(`Would extract chunk from ${startTime}s to ${endTime}s`)
    return buffer
  }
}

// Export singleton
export const parallelProcessor = new ParallelTranscriptionProcessor()