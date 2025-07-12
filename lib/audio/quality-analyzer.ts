/**
 * Audio Quality Analyzer
 * Analyzes audio files to determine quality and recommend transcription mode
 */

export interface AudioQualityMetrics {
  overallQuality: number // 0-1 score
  noiseLevel: number // 0-1 (0 = no noise, 1 = very noisy)
  clarity: number // 0-1 (1 = very clear)
  volumeConsistency: number // 0-1 (1 = consistent)
  silenceRatio: number // 0-1 (ratio of silence)
  clipping: boolean // Audio clipping detected
  sampleRate: number // Hz
  bitRate: number // kbps
  channels: number // mono/stereo
  recommendation: {
    mode: 'fast' | 'balanced' | 'precision'
    confidence: number
    reasons: string[]
  }
}

export class AudioQualityAnalyzer {
  private audioContext: AudioContext | null = null

  constructor() {
    if (typeof window !== 'undefined' && window.AudioContext) {
      this.audioContext = new AudioContext()
    }
  }

  /**
   * Analyze audio file quality
   */
  async analyzeFile(file: File): Promise<AudioQualityMetrics> {
    if (!this.audioContext) {
      // Fallback for server-side or unsupported browsers
      return this.getBasicMetrics(file)
    }

    try {
      const arrayBuffer = await file.arrayBuffer()
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)
      
      return this.analyzeAudioBuffer(audioBuffer, file)
    } catch (error) {
      console.error('Audio analysis failed:', error)
      return this.getBasicMetrics(file)
    }
  }

  /**
   * Analyze decoded audio buffer
   */
  private analyzeAudioBuffer(audioBuffer: AudioBuffer, file: File): AudioQualityMetrics {
    const sampleRate = audioBuffer.sampleRate
    const channels = audioBuffer.numberOfChannels
    const duration = audioBuffer.duration
    const bitRate = Math.round((file.size * 8) / duration / 1000) // kbps

    // Get audio data from first channel
    const audioData = audioBuffer.getChannelData(0)
    
    // Calculate metrics
    const noiseLevel = this.calculateNoiseLevel(audioData, sampleRate)
    const clarity = this.calculateClarity(audioData, sampleRate)
    const volumeConsistency = this.calculateVolumeConsistency(audioData)
    const silenceRatio = this.calculateSilenceRatio(audioData)
    const clipping = this.detectClipping(audioData)
    
    // Overall quality score
    const overallQuality = this.calculateOverallQuality({
      noiseLevel,
      clarity,
      volumeConsistency,
      silenceRatio,
      clipping,
      sampleRate,
      bitRate
    })

    // Get recommendation
    const recommendation = this.getRecommendation({
      overallQuality,
      noiseLevel,
      clarity,
      volumeConsistency,
      silenceRatio,
      clipping
    })

    return {
      overallQuality,
      noiseLevel,
      clarity,
      volumeConsistency,
      silenceRatio,
      clipping,
      sampleRate,
      bitRate,
      channels,
      recommendation
    }
  }

  /**
   * Calculate noise level (simplified)
   */
  private calculateNoiseLevel(audioData: Float32Array, sampleRate: number): number {
    // Calculate RMS of quiet sections
    const windowSize = Math.floor(sampleRate * 0.1) // 100ms windows
    const windows = Math.floor(audioData.length / windowSize)
    const rmsValues: number[] = []

    for (let i = 0; i < windows; i++) {
      const start = i * windowSize
      const end = start + windowSize
      let sum = 0
      
      for (let j = start; j < end; j++) {
        sum += audioData[j] * audioData[j]
      }
      
      const rms = Math.sqrt(sum / windowSize)
      rmsValues.push(rms)
    }

    // Sort and take bottom 10% as noise floor
    rmsValues.sort((a, b) => a - b)
    const noiseFloorSamples = Math.floor(rmsValues.length * 0.1)
    let noiseSum = 0
    
    for (let i = 0; i < noiseFloorSamples; i++) {
      noiseSum += rmsValues[i]
    }
    
    const noiseFloor = noiseSum / noiseFloorSamples
    return Math.min(1, noiseFloor * 10) // Scale to 0-1
  }

  /**
   * Calculate audio clarity (simplified)
   */
  private calculateClarity(audioData: Float32Array, sampleRate: number): number {
    // Use zero-crossing rate as a simple clarity metric
    let zeroCrossings = 0
    
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
        zeroCrossings++
      }
    }
    
    const zeroCrossingRate = zeroCrossings / audioData.length
    
    // Expected range for speech is 0.02-0.05
    if (zeroCrossingRate >= 0.02 && zeroCrossingRate <= 0.05) {
      return 0.9 // High clarity
    } else if (zeroCrossingRate >= 0.01 && zeroCrossingRate <= 0.08) {
      return 0.7 // Medium clarity
    } else {
      return 0.5 // Low clarity
    }
  }

  /**
   * Calculate volume consistency
   */
  private calculateVolumeConsistency(audioData: Float32Array): number {
    const windowSize = 1024
    const windows = Math.floor(audioData.length / windowSize)
    const rmsValues: number[] = []

    for (let i = 0; i < windows; i++) {
      const start = i * windowSize
      const end = start + windowSize
      let sum = 0
      
      for (let j = start; j < end; j++) {
        sum += audioData[j] * audioData[j]
      }
      
      const rms = Math.sqrt(sum / windowSize)
      if (rms > 0.01) { // Ignore silence
        rmsValues.push(rms)
      }
    }

    if (rmsValues.length === 0) return 0

    // Calculate standard deviation
    const mean = rmsValues.reduce((a, b) => a + b, 0) / rmsValues.length
    const variance = rmsValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / rmsValues.length
    const stdDev = Math.sqrt(variance)
    
    // Lower std dev = more consistent
    return Math.max(0, 1 - (stdDev / mean))
  }

  /**
   * Calculate silence ratio
   */
  private calculateSilenceRatio(audioData: Float32Array): number {
    const threshold = 0.01
    let silentSamples = 0
    
    for (let i = 0; i < audioData.length; i++) {
      if (Math.abs(audioData[i]) < threshold) {
        silentSamples++
      }
    }
    
    return silentSamples / audioData.length
  }

  /**
   * Detect audio clipping
   */
  private detectClipping(audioData: Float32Array): boolean {
    const clippingThreshold = 0.99
    let clippedSamples = 0
    
    for (let i = 0; i < audioData.length; i++) {
      if (Math.abs(audioData[i]) >= clippingThreshold) {
        clippedSamples++
      }
    }
    
    // If more than 0.1% samples are clipped, consider it clipping
    return (clippedSamples / audioData.length) > 0.001
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallQuality(metrics: {
    noiseLevel: number
    clarity: number
    volumeConsistency: number
    silenceRatio: number
    clipping: boolean
    sampleRate: number
    bitRate: number
  }): number {
    let score = 0
    
    // Noise level (inverted - lower is better)
    score += (1 - metrics.noiseLevel) * 0.25
    
    // Clarity
    score += metrics.clarity * 0.25
    
    // Volume consistency
    score += metrics.volumeConsistency * 0.2
    
    // Silence ratio (some silence is ok, too much is bad)
    if (metrics.silenceRatio < 0.5) {
      score += 0.15
    } else if (metrics.silenceRatio < 0.7) {
      score += 0.1
    } else {
      score += 0.05
    }
    
    // Technical quality
    if (metrics.sampleRate >= 16000) score += 0.05
    if (metrics.bitRate >= 64) score += 0.05
    
    // Penalties
    if (metrics.clipping) score -= 0.2
    
    return Math.max(0, Math.min(1, score))
  }

  /**
   * Get mode recommendation based on metrics
   */
  private getRecommendation(metrics: {
    overallQuality: number
    noiseLevel: number
    clarity: number
    volumeConsistency: number
    silenceRatio: number
    clipping: boolean
  }): AudioQualityMetrics['recommendation'] {
    const reasons: string[] = []
    let mode: 'fast' | 'balanced' | 'precision' = 'balanced'
    let confidence = 0.8

    // High quality audio - use fast mode
    if (metrics.overallQuality > 0.8 && !metrics.clipping) {
      mode = 'fast'
      reasons.push('Kiváló hangminőség')
      confidence = 0.9
    }
    // Poor quality audio - use precision mode
    else if (metrics.overallQuality < 0.5 || metrics.noiseLevel > 0.7) {
      mode = 'precision'
      reasons.push('Gyenge hangminőség')
      confidence = 0.85
    }
    // Clipping detected - use precision
    else if (metrics.clipping) {
      mode = 'precision'
      reasons.push('Torzítás észlelve')
      confidence = 0.9
    }
    // High silence ratio - might need precision
    else if (metrics.silenceRatio > 0.7) {
      mode = 'precision'
      reasons.push('Sok csend a felvételben')
      confidence = 0.7
    }
    // Default to balanced
    else {
      mode = 'balanced'
      reasons.push('Átlagos hangminőség')
      confidence = 0.8
    }

    // Add specific quality indicators
    if (metrics.noiseLevel > 0.5) reasons.push('Zajos felvétel')
    if (metrics.clarity < 0.6) reasons.push('Nem tiszta beszéd')
    if (metrics.volumeConsistency < 0.5) reasons.push('Változó hangerő')

    return { mode, confidence, reasons }
  }

  /**
   * Fallback metrics for server-side or unsupported browsers
   */
  private getBasicMetrics(file: File): AudioQualityMetrics {
    // Estimate quality based on file properties
    const fileSizeMB = file.size / (1024 * 1024)
    const fileType = file.type
    
    // Basic heuristics
    let overallQuality = 0.7 // Default to medium
    const reasons: string[] = []
    
    // File type quality assumptions
    if (fileType === 'audio/wav' || fileType === 'audio/x-wav') {
      overallQuality = 0.85
      reasons.push('WAV formátum - jó minőség')
    } else if (fileType === 'audio/mp3' || fileType === 'audio/mpeg') {
      overallQuality = 0.75
      reasons.push('MP3 formátum - átlagos minőség')
    } else if (fileType === 'audio/mp4' || fileType === 'audio/x-m4a') {
      overallQuality = 0.8
      reasons.push('M4A formátum - jó minőség')
    }
    
    // Recommend based on basic quality
    let mode: 'fast' | 'balanced' | 'precision' = 'balanced'
    if (overallQuality > 0.8) {
      mode = 'fast'
    } else if (overallQuality < 0.6) {
      mode = 'precision'
    }

    return {
      overallQuality,
      noiseLevel: 0.3, // Unknown
      clarity: overallQuality,
      volumeConsistency: 0.7, // Unknown
      silenceRatio: 0.2, // Unknown
      clipping: false, // Unknown
      sampleRate: 44100, // Assume standard
      bitRate: 128, // Assume standard
      channels: 2, // Assume stereo
      recommendation: {
        mode,
        confidence: 0.6, // Lower confidence for basic analysis
        reasons
      }
    }
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }
  }
}

// Export singleton instance
export const audioQualityAnalyzer = new AudioQualityAnalyzer()