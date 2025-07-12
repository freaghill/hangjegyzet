interface AudioConstraints {
  sampleRate: number
  channelCount: number
  echoCancellation: boolean
  noiseSuppression: boolean
  autoGainControl: boolean
}

interface AudioMetrics {
  level: number
  peakLevel: number
  noiseLevel: number
  clipping: boolean
  voiceActivity: boolean
  signalToNoise: number
}

interface ProcessedAudioChunk {
  data: Float32Array
  timestamp: number
  metrics: AudioMetrics
  format: {
    sampleRate: number
    channels: number
    bitDepth: number
  }
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null
  private sourceNode: MediaStreamAudioSourceNode | null = null
  private analyserNode: AnalyserNode | null = null
  private processorNode: ScriptProcessorNode | null = null
  private stream: MediaStream | null = null
  
  private constraints: AudioConstraints = {
    sampleRate: 16000,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  }
  
  private bufferSize = 4096
  private isProcessing = false
  private noiseFloor = 0.01
  private voiceActivityThreshold = 0.02
  private peakHistory: number[] = []
  private noiseHistory: number[] = []
  
  // Callbacks
  private onAudioChunk: ((chunk: ProcessedAudioChunk) => void) | null = null
  private onMetricsUpdate: ((metrics: AudioMetrics) => void) | null = null
  private onError: ((error: Error) => void) | null = null
  
  constructor(options?: Partial<AudioConstraints>) {
    if (options) {
      this.constraints = { ...this.constraints, ...options }
    }
  }
  
  // Initialize WebRTC audio capture
  public async initialize(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.constraints.sampleRate,
          channelCount: this.constraints.channelCount,
          echoCancellation: this.constraints.echoCancellation,
          noiseSuppression: this.constraints.noiseSuppression,
          autoGainControl: this.constraints.autoGainControl,
          // Additional constraints for better quality
          sampleSize: 16,
          latency: 0.01, // 10ms latency target
        },
        video: false,
      })
      
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: this.constraints.sampleRate,
        latencyHint: 'interactive',
      })
      
      // Create nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream)
      this.analyserNode = this.audioContext.createAnalyser()
      this.analyserNode.fftSize = 2048
      this.analyserNode.smoothingTimeConstant = 0.8
      
      // Create script processor for audio chunks
      this.processorNode = this.audioContext.createScriptProcessor(
        this.bufferSize,
        this.constraints.channelCount,
        this.constraints.channelCount
      )
      
      // Set up audio processing pipeline
      this.processorNode.onaudioprocess = this.processAudioEvent.bind(this)
      
      // Connect nodes
      this.sourceNode.connect(this.analyserNode)
      this.analyserNode.connect(this.processorNode)
      this.processorNode.connect(this.audioContext.destination)
      
      // Calibrate noise floor
      await this.calibrateNoiseFloor()
      
      console.log('Audio processor initialized successfully')
    } catch (error) {
      console.error('Failed to initialize audio processor:', error)
      this.handleError(error as Error)
      throw error
    }
  }
  
  // Start processing audio
  public start(
    onAudioChunk: (chunk: ProcessedAudioChunk) => void,
    onMetricsUpdate?: (metrics: AudioMetrics) => void,
    onError?: (error: Error) => void
  ): void {
    if (!this.audioContext || !this.stream) {
      throw new Error('Audio processor not initialized')
    }
    
    this.onAudioChunk = onAudioChunk
    this.onMetricsUpdate = onMetricsUpdate || null
    this.onError = onError || null
    this.isProcessing = true
    
    console.log('Audio processing started')
  }
  
  // Stop processing audio
  public stop(): void {
    this.isProcessing = false
    
    if (this.processorNode) {
      this.processorNode.disconnect()
    }
    
    if (this.analyserNode) {
      this.analyserNode.disconnect()
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect()
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop())
    }
    
    if (this.audioContext) {
      this.audioContext.close()
    }
    
    this.cleanup()
    console.log('Audio processing stopped')
  }
  
  // Process audio event from script processor
  private processAudioEvent(event: AudioProcessingEvent): void {
    if (!this.isProcessing) return
    
    try {
      const inputBuffer = event.inputBuffer
      const outputBuffer = event.outputBuffer
      
      // Process each channel
      for (let channel = 0; channel < inputBuffer.numberOfChannels; channel++) {
        const inputData = inputBuffer.getChannelData(channel)
        const outputData = outputBuffer.getChannelData(channel)
        
        // Apply audio processing
        const processedData = this.processAudioData(inputData)
        
        // Copy processed data to output (for monitoring)
        outputData.set(processedData)
        
        // Calculate metrics
        const metrics = this.calculateMetrics(processedData)
        
        // Create processed chunk
        const chunk: ProcessedAudioChunk = {
          data: processedData,
          timestamp: Date.now(),
          metrics,
          format: {
            sampleRate: this.audioContext!.sampleRate,
            channels: inputBuffer.numberOfChannels,
            bitDepth: 16,
          },
        }
        
        // Emit chunk if voice activity detected or if we're in continuous mode
        if (metrics.voiceActivity || !this.constraints.noiseSuppression) {
          if (this.onAudioChunk) {
            this.onAudioChunk(chunk)
          }
        }
        
        // Update metrics
        if (this.onMetricsUpdate) {
          this.onMetricsUpdate(metrics)
        }
      }
    } catch (error) {
      this.handleError(error as Error)
    }
  }
  
  // Process audio data
  private processAudioData(inputData: Float32Array): Float32Array {
    const processedData = new Float32Array(inputData.length)
    
    // Apply high-pass filter to remove DC offset and low-frequency noise
    let prev = 0
    for (let i = 0; i < inputData.length; i++) {
      processedData[i] = inputData[i] - prev * 0.95
      prev = inputData[i]
    }
    
    // Apply noise gate
    if (this.constraints.noiseSuppression) {
      for (let i = 0; i < processedData.length; i++) {
        if (Math.abs(processedData[i]) < this.noiseFloor) {
          processedData[i] = 0
        }
      }
    }
    
    // Apply dynamic range compression to prevent clipping
    const compressionRatio = 4
    const threshold = 0.7
    
    for (let i = 0; i < processedData.length; i++) {
      const sample = processedData[i]
      const absSample = Math.abs(sample)
      
      if (absSample > threshold) {
        const excess = absSample - threshold
        const compressedExcess = excess / compressionRatio
        const newMagnitude = threshold + compressedExcess
        processedData[i] = sample > 0 ? newMagnitude : -newMagnitude
      }
    }
    
    return processedData
  }
  
  // Calculate audio metrics
  private calculateMetrics(data: Float32Array): AudioMetrics {
    let sum = 0
    let peak = 0
    let clipping = false
    
    // Calculate RMS and peak levels
    for (const sample of data) {
      const absSample = Math.abs(sample)
      sum += sample * sample
      peak = Math.max(peak, absSample)
      
      if (absSample >= 0.99) {
        clipping = true
      }
    }
    
    const rms = Math.sqrt(sum / data.length)
    
    // Update histories
    this.peakHistory.push(peak)
    if (this.peakHistory.length > 100) {
      this.peakHistory.shift()
    }
    
    // Calculate noise level (use minimum RMS from recent history)
    const recentRMS = rms
    this.noiseHistory.push(recentRMS)
    if (this.noiseHistory.length > 50) {
      this.noiseHistory.shift()
    }
    
    const noiseLevel = Math.min(...this.noiseHistory)
    
    // Voice activity detection
    const voiceActivity = rms > this.voiceActivityThreshold && 
                         peak > this.noiseFloor * 2
    
    // Signal-to-noise ratio
    const signalToNoise = noiseLevel > 0 ? rms / noiseLevel : 100
    
    return {
      level: rms,
      peakLevel: peak,
      noiseLevel,
      clipping,
      voiceActivity,
      signalToNoise,
    }
  }
  
  // Calibrate noise floor
  private async calibrateNoiseFloor(): Promise<void> {
    return new Promise((resolve) => {
      const samples: number[] = []
      let calibrationFrames = 0
      const targetFrames = 50 // ~500ms of calibration
      
      const originalProcessor = this.processorNode!.onaudioprocess
      
      this.processorNode!.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0)
        
        // Calculate RMS
        let sum = 0
        for (const sample of inputData) {
          sum += sample * sample
        }
        const rms = Math.sqrt(sum / inputData.length)
        
        samples.push(rms)
        calibrationFrames++
        
        if (calibrationFrames >= targetFrames) {
          // Calculate noise floor as 95th percentile of samples
          samples.sort((a, b) => a - b)
          const percentileIndex = Math.floor(samples.length * 0.95)
          this.noiseFloor = samples[percentileIndex] * 1.5 // Add 50% margin
          
          // Restore original processor
          this.processorNode!.onaudioprocess = originalProcessor
          
          console.log(`Noise floor calibrated: ${this.noiseFloor}`)
          resolve()
        }
      }
    })
  }
  
  // Convert Float32Array to WAV format
  public static floatTo16BitPCM(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2)
    const view = new DataView(buffer)
    
    let offset = 0
    for (let i = 0; i < float32Array.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      view.setInt16(offset, s * 0x7fff, true)
    }
    
    return buffer
  }
  
  // Create WAV file from audio data
  public static createWAVFile(
    audioData: Float32Array,
    sampleRate: number,
    channels: number = 1
  ): Blob {
    const length = audioData.length * channels * 2 + 44
    const buffer = new ArrayBuffer(length)
    const view = new DataView(buffer)
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(0, 'RIFF')
    view.setUint32(4, length - 8, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // fmt chunk size
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels * 2, true) // byte rate
    view.setUint16(32, channels * 2, true) // block align
    view.setUint16(34, 16, true) // bits per sample
    writeString(36, 'data')
    view.setUint32(40, audioData.length * channels * 2, true)
    
    // Convert float samples to 16-bit PCM
    const pcmData = this.floatTo16BitPCM(audioData)
    const pcmView = new DataView(pcmData)
    
    let offset = 44
    for (let i = 0; i < pcmData.byteLength; i += 2) {
      view.setInt16(offset, pcmView.getInt16(i, true), true)
      offset += 2
    }
    
    return new Blob([buffer], { type: 'audio/wav' })
  }
  
  // Get current audio level (0-1)
  public getCurrentLevel(): number {
    if (!this.analyserNode) return 0
    
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getByteFrequencyData(dataArray)
    
    let sum = 0
    for (const value of dataArray) {
      sum += value
    }
    
    return sum / (dataArray.length * 255)
  }
  
  // Get frequency data for visualization
  public getFrequencyData(): Uint8Array | null {
    if (!this.analyserNode) return null
    
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount)
    this.analyserNode.getByteFrequencyData(dataArray)
    
    return dataArray
  }
  
  // Update constraints
  public updateConstraints(constraints: Partial<AudioConstraints>): void {
    this.constraints = { ...this.constraints, ...constraints }
    
    // If processing, restart with new constraints
    if (this.isProcessing) {
      const callbacks = {
        onAudioChunk: this.onAudioChunk,
        onMetricsUpdate: this.onMetricsUpdate,
        onError: this.onError,
      }
      
      this.stop()
      this.initialize().then(() => {
        if (callbacks.onAudioChunk) {
          this.start(
            callbacks.onAudioChunk,
            callbacks.onMetricsUpdate || undefined,
            callbacks.onError || undefined
          )
        }
      })
    }
  }
  
  // Handle errors
  private handleError(error: Error): void {
    console.error('Audio processor error:', error)
    if (this.onError) {
      this.onError(error)
    }
  }
  
  // Cleanup resources
  private cleanup(): void {
    this.audioContext = null
    this.sourceNode = null
    this.analyserNode = null
    this.processorNode = null
    this.stream = null
    this.onAudioChunk = null
    this.onMetricsUpdate = null
    this.onError = null
    this.peakHistory = []
    this.noiseHistory = []
  }
}

// Audio format conversion utilities
export class AudioFormatConverter {
  // Convert audio buffer to Whisper-compatible format
  static toWhisperFormat(
    audioData: Float32Array,
    sourceSampleRate: number
  ): Float32Array {
    const targetSampleRate = 16000
    
    if (sourceSampleRate === targetSampleRate) {
      return audioData
    }
    
    // Resample to 16kHz
    const ratio = sourceSampleRate / targetSampleRate
    const newLength = Math.floor(audioData.length / ratio)
    const resampled = new Float32Array(newLength)
    
    for (let i = 0; i < newLength; i++) {
      const sourceIndex = i * ratio
      const lowerIndex = Math.floor(sourceIndex)
      const upperIndex = Math.ceil(sourceIndex)
      const fraction = sourceIndex - lowerIndex
      
      if (upperIndex >= audioData.length) {
        resampled[i] = audioData[lowerIndex]
      } else {
        // Linear interpolation
        resampled[i] = audioData[lowerIndex] * (1 - fraction) + 
                      audioData[upperIndex] * fraction
      }
    }
    
    return resampled
  }
  
  // Merge multiple audio channels
  static mergeChannels(channelData: Float32Array[]): Float32Array {
    if (channelData.length === 1) {
      return channelData[0]
    }
    
    const length = channelData[0].length
    const merged = new Float32Array(length)
    
    for (let i = 0; i < length; i++) {
      let sum = 0
      for (const channel of channelData) {
        sum += channel[i]
      }
      merged[i] = sum / channelData.length
    }
    
    return merged
  }
}

// Echo cancellation implementation
export class EchoCanceller {
  private adaptiveFilter: Float32Array
  private filterLength: number
  private stepSize: number
  private referenceBuffer: Float32Array[]
  private bufferIndex: number
  
  constructor(filterLength: number = 256, stepSize: number = 0.01) {
    this.filterLength = filterLength
    this.stepSize = stepSize
    this.adaptiveFilter = new Float32Array(filterLength)
    this.referenceBuffer = []
    this.bufferIndex = 0
  }
  
  // Process audio with echo cancellation
  process(
    inputSignal: Float32Array,
    referenceSignal: Float32Array
  ): Float32Array {
    const output = new Float32Array(inputSignal.length)
    
    // Store reference signal
    this.referenceBuffer.push(referenceSignal)
    if (this.referenceBuffer.length > this.filterLength) {
      this.referenceBuffer.shift()
    }
    
    // Apply adaptive filter
    for (let i = 0; i < inputSignal.length; i++) {
      // Estimate echo
      let echoEstimate = 0
      for (let j = 0; j < this.adaptiveFilter.length; j++) {
        const refIndex = i - j
        if (refIndex >= 0 && this.referenceBuffer[0]) {
          echoEstimate += this.adaptiveFilter[j] * this.referenceBuffer[0][refIndex]
        }
      }
      
      // Subtract estimated echo
      const error = inputSignal[i] - echoEstimate
      output[i] = error
      
      // Update adaptive filter (NLMS algorithm)
      let power = 0
      for (let j = 0; j < this.adaptiveFilter.length; j++) {
        const refIndex = i - j
        if (refIndex >= 0 && this.referenceBuffer[0]) {
          power += this.referenceBuffer[0][refIndex] ** 2
        }
      }
      
      if (power > 0) {
        const mu = this.stepSize / (power + 0.001)
        for (let j = 0; j < this.adaptiveFilter.length; j++) {
          const refIndex = i - j
          if (refIndex >= 0 && this.referenceBuffer[0]) {
            this.adaptiveFilter[j] += mu * error * this.referenceBuffer[0][refIndex]
          }
        }
      }
    }
    
    return output
  }
}