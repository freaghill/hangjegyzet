import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'

const execAsync = promisify(exec)

export interface AudioQualityMetrics {
  signalToNoiseRatio: number
  peakLevel: number
  averageLevel: number
  silencePercentage: number
  clippingDetected: boolean
  quality: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface VoiceActivitySegment {
  start: number
  end: number
  confidence: number
}

export interface PreprocessingResult {
  processedAudioBuffer: Buffer
  originalDuration: number
  processedDuration: number
  qualityMetrics: AudioQualityMetrics
  voiceSegments: VoiceActivitySegment[]
  needsEnhancement: boolean
}

export class AudioPreprocessor {
  private tempDir: string

  constructor() {
    this.tempDir = tmpdir()
  }

  /**
   * Main preprocessing pipeline
   */
  async preprocess(
    audioBuffer: Buffer,
    options: {
      noiseReduction?: boolean
      normalize?: boolean
      detectVoiceActivity?: boolean
      enhanceQuality?: boolean
    } = {}
  ): Promise<PreprocessingResult> {
    const {
      noiseReduction = true,
      normalize = true,
      detectVoiceActivity = true,
      enhanceQuality = true
    } = options

    // Create temporary files
    const inputPath = join(this.tempDir, `input-${uuidv4()}.wav`)
    const outputPath = join(this.tempDir, `output-${uuidv4()}.wav`)

    try {
      // Write input buffer to temp file
      await writeFile(inputPath, audioBuffer)

      // Get original audio info
      const originalInfo = await this.getAudioInfo(inputPath)

      // Build FFmpeg processing chain
      let ffmpegCommand = `ffmpeg -i "${inputPath}" -af "`
      const filters: string[] = []

      // Apply high-pass filter to remove low-frequency noise
      if (noiseReduction) {
        filters.push('highpass=f=80')
        filters.push('lowpass=f=8000')
      }

      // Apply noise reduction using FFmpeg's afftdn filter
      if (noiseReduction) {
        filters.push('afftdn=nf=-25')
      }

      // Normalize audio levels
      if (normalize) {
        filters.push('loudnorm=I=-16:TP=-1.5:LRA=11')
      }

      // Apply compression to even out volume
      if (enhanceQuality) {
        filters.push('acompressor=threshold=-20dB:ratio=4:attack=5:release=50')
      }

      // Remove silence at beginning and end
      filters.push('silenceremove=1:0:-50dB:1:1:-50dB')

      ffmpegCommand += filters.join(',')
      ffmpegCommand += `" -ar 16000 -ac 1 -acodec pcm_s16le "${outputPath}"`

      // Execute FFmpeg command
      await execAsync(ffmpegCommand)

      // Read processed audio
      const processedBuffer = await this.readFile(outputPath)

      // Get processed audio info
      const processedInfo = await this.getAudioInfo(outputPath)

      // Analyze audio quality
      const qualityMetrics = await this.analyzeAudioQuality(outputPath)

      // Detect voice activity segments
      let voiceSegments: VoiceActivitySegment[] = []
      if (detectVoiceActivity) {
        voiceSegments = await this.detectVoiceActivity(outputPath)
      }

      // Clean up temp files
      await this.cleanup([inputPath, outputPath])

      return {
        processedAudioBuffer: processedBuffer,
        originalDuration: originalInfo.duration,
        processedDuration: processedInfo.duration,
        qualityMetrics,
        voiceSegments,
        needsEnhancement: qualityMetrics.quality === 'poor' || qualityMetrics.quality === 'fair'
      }
    } catch (error) {
      // Clean up on error
      await this.cleanup([inputPath, outputPath]).catch(() => {})
      throw error
    }
  }

  /**
   * Analyze audio quality metrics
   */
  private async analyzeAudioQuality(audioPath: string): Promise<AudioQualityMetrics> {
    try {
      // Use FFmpeg to analyze audio statistics
      const { stdout } = await execAsync(
        `ffmpeg -i "${audioPath}" -af "astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.Peak_level:file=-" -f null -`
      )

      // Parse statistics from output
      const stats = this.parseFFmpegStats(stdout)

      // Calculate SNR (simplified - in production use more sophisticated methods)
      const signalToNoiseRatio = this.calculateSNR(stats)

      // Determine overall quality
      const quality = this.determineQuality(signalToNoiseRatio, stats)

      return {
        signalToNoiseRatio,
        peakLevel: stats.peakLevel || -30,
        averageLevel: stats.avgLevel || -40,
        silencePercentage: stats.silencePercentage || 0,
        clippingDetected: stats.clipping || false,
        quality
      }
    } catch (error) {
      console.error('Error analyzing audio quality:', error)
      // Return default metrics on error
      return {
        signalToNoiseRatio: 20,
        peakLevel: -20,
        averageLevel: -30,
        silencePercentage: 10,
        clippingDetected: false,
        quality: 'fair'
      }
    }
  }

  /**
   * Voice Activity Detection using FFmpeg
   */
  private async detectVoiceActivity(audioPath: string): Promise<VoiceActivitySegment[]> {
    try {
      // Use FFmpeg's silencedetect to find speech segments
      const { stderr } = await execAsync(
        `ffmpeg -i "${audioPath}" -af "silencedetect=noise=-30dB:d=0.3" -f null - 2>&1`
      )

      // Parse silence detection output
      const segments: VoiceActivitySegment[] = []
      const lines = stderr.split('\n')
      
      let lastEnd = 0
      const silenceStarts: number[] = []
      const silenceEnds: number[] = []

      lines.forEach(line => {
        const startMatch = line.match(/silence_start: ([\d.]+)/)
        const endMatch = line.match(/silence_end: ([\d.]+)/)
        
        if (startMatch) {
          silenceStarts.push(parseFloat(startMatch[1]))
        }
        if (endMatch) {
          silenceEnds.push(parseFloat(endMatch[1]))
        }
      })

      // Convert silence periods to voice segments
      const duration = await this.getAudioDuration(audioPath)
      
      if (silenceStarts.length === 0) {
        // No silence detected - entire audio is voice
        segments.push({ start: 0, end: duration, confidence: 0.9 })
      } else {
        // First voice segment (if audio doesn't start with silence)
        if (silenceStarts[0] > 0.1) {
          segments.push({ start: 0, end: silenceStarts[0], confidence: 0.9 })
        }

        // Middle voice segments
        for (let i = 0; i < silenceEnds.length; i++) {
          const voiceStart = silenceEnds[i]
          const voiceEnd = i < silenceStarts.length - 1 ? silenceStarts[i + 1] : duration
          
          if (voiceEnd - voiceStart > 0.3) { // Minimum segment duration
            segments.push({ start: voiceStart, end: voiceEnd, confidence: 0.9 })
          }
        }
      }

      return segments
    } catch (error) {
      console.error('Error detecting voice activity:', error)
      // Return single segment covering entire audio on error
      const duration = await this.getAudioDuration(audioPath)
      return [{ start: 0, end: duration, confidence: 0.5 }]
    }
  }

  /**
   * Enhanced noise reduction for poor quality audio
   */
  async enhanceAudio(audioBuffer: Buffer): Promise<Buffer> {
    const inputPath = join(this.tempDir, `enhance-input-${uuidv4()}.wav`)
    const outputPath = join(this.tempDir, `enhance-output-${uuidv4()}.wav`)

    try {
      await writeFile(inputPath, audioBuffer)

      // Apply aggressive noise reduction and enhancement
      const command = `ffmpeg -i "${inputPath}" -af "
        highpass=f=100,
        lowpass=f=7000,
        afftdn=nf=-30:nw=1:om=o,
        volume=2,
        acompressor=threshold=-24dB:ratio=6:attack=3:release=25,
        loudnorm=I=-14:TP=-1:LRA=7,
        aresample=16000
      " -ar 16000 -ac 1 -acodec pcm_s16le "${outputPath}"`

      await execAsync(command.replace(/\n/g, ''))

      const enhancedBuffer = await this.readFile(outputPath)
      await this.cleanup([inputPath, outputPath])

      return enhancedBuffer
    } catch (error) {
      await this.cleanup([inputPath, outputPath]).catch(() => {})
      throw error
    }
  }

  /**
   * Prepare audio specifically for Whisper
   */
  async prepareForWhisper(
    audioBuffer: Buffer,
    options: {
      targetSampleRate?: number
      targetBitrate?: string
    } = {}
  ): Promise<Buffer> {
    const {
      targetSampleRate = 16000,
      targetBitrate = '64k'
    } = options

    const inputPath = join(this.tempDir, `whisper-input-${uuidv4()}.wav`)
    const outputPath = join(this.tempDir, `whisper-output-${uuidv4()}.mp3`)

    try {
      await writeFile(inputPath, audioBuffer)

      // Convert to format optimal for Whisper
      const command = `ffmpeg -i "${inputPath}" -ar ${targetSampleRate} -ac 1 -b:a ${targetBitrate} "${outputPath}"`
      await execAsync(command)

      const preparedBuffer = await this.readFile(outputPath)
      await this.cleanup([inputPath, outputPath])

      return preparedBuffer
    } catch (error) {
      await this.cleanup([inputPath, outputPath]).catch(() => {})
      throw error
    }
  }

  /**
   * Helper: Get audio information
   */
  private async getAudioInfo(audioPath: string): Promise<{ duration: number; sampleRate: number }> {
    const { stdout } = await execAsync(
      `ffprobe -v quiet -print_format json -show_format -show_streams "${audioPath}"`
    )
    
    const info = JSON.parse(stdout)
    return {
      duration: parseFloat(info.format.duration || '0'),
      sampleRate: parseInt(info.streams[0]?.sample_rate || '16000')
    }
  }

  /**
   * Helper: Get audio duration
   */
  private async getAudioDuration(audioPath: string): Promise<number> {
    const info = await this.getAudioInfo(audioPath)
    return info.duration
  }

  /**
   * Helper: Read file as buffer
   */
  private async readFile(path: string): Promise<Buffer> {
    const { readFile } = await import('fs/promises')
    return readFile(path)
  }

  /**
   * Helper: Parse FFmpeg statistics
   */
  private parseFFmpegStats(output: string): any {
    const stats: any = {}
    
    // Extract peak level
    const peakMatch = output.match(/Peak_level=([-\d.]+)/)
    if (peakMatch) {
      stats.peakLevel = parseFloat(peakMatch[1])
    }

    // Extract RMS level
    const rmsMatch = output.match(/RMS_level=([-\d.]+)/)
    if (rmsMatch) {
      stats.avgLevel = parseFloat(rmsMatch[1])
    }

    // Check for clipping
    stats.clipping = output.includes('clipping') || stats.peakLevel > -0.1

    return stats
  }

  /**
   * Helper: Calculate Signal-to-Noise Ratio
   */
  private calculateSNR(stats: any): number {
    // Simplified SNR calculation
    const signal = stats.avgLevel || -30
    const noise = -60 // Assumed noise floor
    return Math.max(0, signal - noise)
  }

  /**
   * Helper: Determine audio quality
   */
  private determineQuality(snr: number, stats: any): AudioQualityMetrics['quality'] {
    if (stats.clipping) return 'poor'
    if (snr < 10) return 'poor'
    if (snr < 20) return 'fair'
    if (snr < 30) return 'good'
    return 'excellent'
  }

  /**
   * Helper: Clean up temporary files
   */
  private async cleanup(paths: string[]): Promise<void> {
    await Promise.all(
      paths.map(path => unlink(path).catch(() => {}))
    )
  }
}

export const audioPreprocessor = new AudioPreprocessor()