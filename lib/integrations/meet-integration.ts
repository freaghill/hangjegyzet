import { EventEmitter } from 'events'

interface GoogleMeetInfo {
  meetingId: string
  meetingCode: string
  title: string
  organizer: string
  participants: string[]
  startTime: Date
  audioStream?: MediaStream
}

interface GoogleMeetConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
  apiKey: string
}

export class GoogleMeetIntegration extends EventEmitter {
  private config: GoogleMeetConfig
  private accessToken?: string
  private isConnected: boolean = false
  private currentMeeting?: GoogleMeetInfo
  private audioContext?: AudioContext
  private mediaRecorder?: MediaRecorder

  constructor(config: GoogleMeetConfig) {
    super()
    this.config = config
  }

  /**
   * Initialize Google Meet integration
   */
  async initialize(): Promise<void> {
    try {
      await this.authenticateWithGoogle()
      this.isConnected = true
      this.emit('connected')
    } catch (error) {
      console.error('Failed to initialize Google Meet integration:', error)
      throw error
    }
  }

  /**
   * Authenticate with Google OAuth
   */
  private async authenticateWithGoogle(): Promise<void> {
    // In production: Implement Google OAuth 2.0 flow
    return new Promise((resolve) => {
      setTimeout(() => {
        this.accessToken = 'mock-google-access-token'
        console.log('Authenticated with Google')
        resolve()
      }, 1000)
    })
  }

  /**
   * Join a Google Meet
   */
  async joinMeeting(meetingCode: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Google Meet')
    }

    try {
      // Parse meeting code
      const cleanCode = meetingCode.replace(/-/g, '')
      
      // In production: Use Google Meet API
      this.currentMeeting = {
        meetingId: `meet_${cleanCode}`,
        meetingCode: cleanCode,
        title: 'Google Meet Session',
        organizer: 'organizer@gmail.com',
        participants: ['participant1@gmail.com', 'participant2@gmail.com'],
        startTime: new Date()
      }

      // Start audio capture
      await this.startAudioCapture()
      
      // Start recording for backup
      this.startRecording()
      
      this.emit('meetingJoined', this.currentMeeting)
    } catch (error) {
      console.error('Failed to join Google Meet:', error)
      throw error
    }
  }

  /**
   * Start capturing audio from Google Meet
   */
  private async startAudioCapture(): Promise<void> {
    try {
      // Request audio with specific constraints for better quality
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      })

      this.currentMeeting!.audioStream = stream
      
      // Set up audio processing
      this.audioContext = new AudioContext({ sampleRate: 48000 })
      const source = this.audioContext.createMediaStreamSource(stream)
      
      // Create a compressor for better audio quality
      const compressor = this.audioContext.createDynamicsCompressor()
      compressor.threshold.setValueAtTime(-50, this.audioContext.currentTime)
      compressor.knee.setValueAtTime(40, this.audioContext.currentTime)
      compressor.ratio.setValueAtTime(12, this.audioContext.currentTime)
      compressor.attack.setValueAtTime(0, this.audioContext.currentTime)
      compressor.release.setValueAtTime(0.25, this.audioContext.currentTime)
      
      // Create script processor for audio chunks
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
      
      let audioBuffer: Float32Array[] = []
      const BUFFER_SIZE = 16384 // ~340ms at 48kHz
      
      processor.onaudioprocess = (e) => {
        const audioData = e.inputBuffer.getChannelData(0)
        audioBuffer.push(new Float32Array(audioData))
        
        // Emit when buffer is full
        const totalLength = audioBuffer.reduce((acc, buf) => acc + buf.length, 0)
        if (totalLength >= BUFFER_SIZE) {
          // Concatenate buffers
          const combinedBuffer = new Float32Array(totalLength)
          let offset = 0
          for (const buf of audioBuffer) {
            combinedBuffer.set(buf, offset)
            offset += buf.length
          }
          
          this.emit('audioData', {
            data: combinedBuffer.slice(0, BUFFER_SIZE),
            sampleRate: this.audioContext!.sampleRate,
            timestamp: Date.now()
          })
          
          // Keep remaining data
          if (totalLength > BUFFER_SIZE) {
            audioBuffer = [combinedBuffer.slice(BUFFER_SIZE)]
          } else {
            audioBuffer = []
          }
        }
      }
      
      // Connect nodes
      source.connect(compressor)
      compressor.connect(processor)
      processor.connect(this.audioContext.destination)
      
    } catch (error) {
      console.error('Failed to start audio capture:', error)
      throw error
    }
  }

  /**
   * Start recording audio for backup
   */
  private startRecording(): void {
    if (!this.currentMeeting?.audioStream) return
    
    const options = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000
    }
    
    this.mediaRecorder = new MediaRecorder(this.currentMeeting.audioStream, options)
    const chunks: Blob[] = []
    
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }
    
    this.mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      this.emit('recordingComplete', blob)
    }
    
    // Record in 10 second chunks for resilience
    this.mediaRecorder.start(10000)
  }

  /**
   * Get meeting participants from Google Calendar
   */
  async getParticipants(): Promise<string[]> {
    if (!this.currentMeeting || !this.accessToken) {
      return []
    }
    
    try {
      // In production: Use Google Calendar API
      // GET https://www.googleapis.com/calendar/v3/events/{eventId}
      return this.currentMeeting.participants
    } catch (error) {
      console.error('Failed to get participants:', error)
      return []
    }
  }

  /**
   * Get meeting info from Google Calendar
   */
  async getMeetingInfo(): Promise<any> {
    if (!this.currentMeeting || !this.accessToken) {
      return null
    }
    
    try {
      // In production: Use Google Calendar API to get event details
      return {
        title: this.currentMeeting.title,
        organizer: this.currentMeeting.organizer,
        startTime: this.currentMeeting.startTime,
        participants: this.currentMeeting.participants,
        meetingLink: `https://meet.google.com/${this.currentMeeting.meetingCode}`
      }
    } catch (error) {
      console.error('Failed to get meeting info:', error)
      return null
    }
  }

  /**
   * Enable live captions (if available)
   */
  async enableCaptions(language: string = 'hu-HU'): Promise<void> {
    if (!this.currentMeeting) {
      throw new Error('Not in a meeting')
    }
    
    // In production: Interact with Google Meet to enable captions
    this.emit('captionsEnabled', { language })
  }

  /**
   * Leave current Google Meet
   */
  async leaveMeeting(): Promise<void> {
    if (!this.currentMeeting) {
      return
    }

    try {
      // Stop recording
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop()
      }
      
      // Stop audio capture
      if (this.currentMeeting.audioStream) {
        this.currentMeeting.audioStream.getTracks().forEach(track => track.stop())
      }
      
      if (this.audioContext) {
        await this.audioContext.close()
        this.audioContext = undefined
      }
      
      const meetingInfo = { ...this.currentMeeting }
      this.currentMeeting = undefined
      
      this.emit('meetingLeft', meetingInfo)
    } catch (error) {
      console.error('Error leaving meeting:', error)
      throw error
    }
  }

  /**
   * Schedule a Google Meet
   */
  async scheduleMeeting(options: {
    summary: string
    startTime: Date
    endTime: Date
    attendees: string[]
    description?: string
  }): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }
    
    try {
      // In production: Use Google Calendar API
      // POST https://www.googleapis.com/calendar/v3/events
      const meetingCode = this.generateMeetingCode()
      const meetUrl = `https://meet.google.com/${meetingCode}`
      
      const event = {
        summary: options.summary,
        description: options.description,
        start: { dateTime: options.startTime.toISOString() },
        end: { dateTime: options.endTime.toISOString() },
        attendees: options.attendees.map(email => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `hangjegyzet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' }
          }
        }
      }
      
      this.emit('meetingScheduled', {
        ...event,
        meetUrl
      })
      
      return meetUrl
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
      throw error
    }
  }

  /**
   * Generate a meeting code
   */
  private generateMeetingCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz'
    let code = ''
    for (let i = 0; i < 3; i++) {
      if (i > 0) code += '-'
      for (let j = 0; j < 3; j++) {
        code += chars[Math.floor(Math.random() * chars.length)]
      }
    }
    return code
  }

  /**
   * Disconnect from Google Meet
   */
  async disconnect(): Promise<void> {
    if (this.currentMeeting) {
      await this.leaveMeeting()
    }
    
    this.accessToken = undefined
    this.isConnected = false
    this.emit('disconnected')
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected
  }

  /**
   * Get current meeting info
   */
  getCurrentMeeting(): GoogleMeetInfo | undefined {
    return this.currentMeeting
  }
}

// Helper function to create Google Meet integration
export function createGoogleMeetIntegration(config: GoogleMeetConfig): GoogleMeetIntegration {
  return new GoogleMeetIntegration(config)
}

// Google Meet webhook handler
export async function handleGoogleMeetWebhook(
  event: string,
  payload: any
): Promise<void> {
  switch (event) {
    case 'meeting.started':
      console.log('Meeting started:', payload.meetingId)
      break
    case 'meeting.ended':
      console.log('Meeting ended:', payload.meetingId)
      break
    case 'participant.joined':
      console.log('Participant joined:', payload.email)
      break
    case 'participant.left':
      console.log('Participant left:', payload.email)
      break
    case 'recording.available':
      console.log('Recording available:', payload.recordingUrl)
      break
    default:
      console.log('Unknown Google Meet event:', event)
  }
}