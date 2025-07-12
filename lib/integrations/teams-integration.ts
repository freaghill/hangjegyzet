import { EventEmitter } from 'events'

interface TeamsMeetingInfo {
  meetingId: string
  subject: string
  organizer: string
  attendees: string[]
  joinUrl: string
  startTime: Date
  audioStream?: MediaStream
}

interface TeamsConfig {
  clientId: string
  clientSecret: string
  tenantId: string
  redirectUri: string
}

export class TeamsIntegration extends EventEmitter {
  private config: TeamsConfig
  private accessToken?: string
  private isConnected: boolean = false
  private currentMeeting?: TeamsMeetingInfo
  private audioContext?: AudioContext

  constructor(config: TeamsConfig) {
    super()
    this.config = config
  }

  /**
   * Initialize Microsoft Teams integration
   */
  async initialize(): Promise<void> {
    try {
      await this.authenticateWithTeams()
      this.isConnected = true
      this.emit('connected')
    } catch (error) {
      console.error('Failed to initialize Teams integration:', error)
      throw error
    }
  }

  /**
   * Authenticate with Microsoft Graph API
   */
  private async authenticateWithTeams(): Promise<void> {
    // In production: Implement Microsoft OAuth 2.0 flow
    // Using MSAL (Microsoft Authentication Library)
    return new Promise((resolve) => {
      setTimeout(() => {
        this.accessToken = 'mock-access-token'
        console.log('Authenticated with Microsoft Teams')
        resolve()
      }, 1000)
    })
  }

  /**
   * Join a Teams meeting
   */
  async joinMeeting(meetingUrl: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to Teams')
    }

    try {
      // Parse meeting ID from URL
      const meetingId = this.parseMeetingId(meetingUrl)
      
      // In production: Use Microsoft Graph API to join meeting
      this.currentMeeting = {
        meetingId,
        subject: 'Teams Meeting',
        organizer: 'organizer@company.com',
        attendees: ['user1@company.com', 'user2@company.com'],
        joinUrl: meetingUrl,
        startTime: new Date()
      }

      // Start audio capture
      await this.startAudioCapture()
      
      this.emit('meetingJoined', this.currentMeeting)
    } catch (error) {
      console.error('Failed to join Teams meeting:', error)
      throw error
    }
  }

  /**
   * Parse meeting ID from Teams URL
   */
  private parseMeetingId(url: string): string {
    // Extract meeting ID from Teams URL
    const match = url.match(/meetingId=([^&]+)/)
    return match ? match[1] : 'unknown'
  }

  /**
   * Start capturing audio from Teams meeting
   */
  private async startAudioCapture(): Promise<void> {
    try {
      // In production: Capture Teams audio through Graph API
      // For demo: capture from microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        } 
      })

      this.currentMeeting!.audioStream = stream
      
      // Set up audio processing
      this.audioContext = new AudioContext({ sampleRate: 16000 })
      const source = this.audioContext.createMediaStreamSource(stream)
      
      // Create analyser for audio levels
      const analyser = this.audioContext.createAnalyser()
      analyser.fftSize = 256
      
      // Connect nodes
      source.connect(analyser)
      
      // Process audio chunks
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      
      const processAudio = () => {
        if (!this.currentMeeting) return
        
        analyser.getByteFrequencyData(dataArray)
        
        // Calculate audio level
        const average = dataArray.reduce((a, b) => a + b) / bufferLength
        
        this.emit('audioLevel', average)
        
        // Continue processing
        requestAnimationFrame(processAudio)
      }
      
      processAudio()
      
      // Also emit raw audio data
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1)
      processor.onaudioprocess = (e) => {
        const audioData = e.inputBuffer.getChannelData(0)
        this.emit('audioData', {
          data: audioData,
          sampleRate: this.audioContext!.sampleRate,
          timestamp: Date.now()
        })
      }
      
      source.connect(processor)
      processor.connect(this.audioContext.destination)
      
    } catch (error) {
      console.error('Failed to start audio capture:', error)
      throw error
    }
  }

  /**
   * Get meeting participants
   */
  async getParticipants(): Promise<string[]> {
    if (!this.currentMeeting || !this.accessToken) {
      return []
    }
    
    try {
      // In production: Use Graph API
      // GET https://graph.microsoft.com/v1.0/me/onlineMeetings/{meetingId}/attendanceReports
      return this.currentMeeting.attendees
    } catch (error) {
      console.error('Failed to get participants:', error)
      return []
    }
  }

  /**
   * Send chat message to Teams meeting
   */
  async sendChatMessage(message: string): Promise<void> {
    if (!this.currentMeeting || !this.accessToken) {
      throw new Error('Not in a meeting')
    }
    
    try {
      // In production: Use Graph API to send chat message
      // POST https://graph.microsoft.com/v1.0/chats/{chat-id}/messages
      this.emit('chatMessage', {
        sender: 'HangJegyzet Assistant',
        message,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Failed to send chat message:', error)
      throw error
    }
  }

  /**
   * Get meeting recording
   */
  async getMeetingRecording(): Promise<string | null> {
    if (!this.currentMeeting || !this.accessToken) {
      return null
    }
    
    try {
      // In production: Use Graph API
      // GET https://graph.microsoft.com/v1.0/me/onlineMeetings/{meetingId}/recordings
      return 'https://example.com/recording.mp4'
    } catch (error) {
      console.error('Failed to get recording:', error)
      return null
    }
  }

  /**
   * Get meeting transcript from Teams
   */
  async getMeetingTranscript(): Promise<string | null> {
    if (!this.currentMeeting || !this.accessToken) {
      return null
    }
    
    try {
      // In production: Use Graph API
      // GET https://graph.microsoft.com/v1.0/me/onlineMeetings/{meetingId}/transcripts
      return 'Meeting transcript content...'
    } catch (error) {
      console.error('Failed to get transcript:', error)
      return null
    }
  }

  /**
   * Leave current Teams meeting
   */
  async leaveMeeting(): Promise<void> {
    if (!this.currentMeeting) {
      return
    }

    try {
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
   * Schedule a Teams meeting
   */
  async scheduleMeeting(options: {
    subject: string
    startTime: Date
    endTime: Date
    attendees: string[]
  }): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Not authenticated')
    }
    
    try {
      // In production: Use Graph API
      // POST https://graph.microsoft.com/v1.0/me/onlineMeetings
      const meetingUrl = `https://teams.microsoft.com/l/meetup-join/${Date.now()}`
      
      this.emit('meetingScheduled', {
        ...options,
        meetingUrl
      })
      
      return meetingUrl
    } catch (error) {
      console.error('Failed to schedule meeting:', error)
      throw error
    }
  }

  /**
   * Disconnect from Teams
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
  getCurrentMeeting(): TeamsMeetingInfo | undefined {
    return this.currentMeeting
  }
}

// Helper function to create Teams integration
export function createTeamsIntegration(config: TeamsConfig): TeamsIntegration {
  return new TeamsIntegration(config)
}

// Teams webhook handler for server-side events
export async function handleTeamsWebhook(
  event: string,
  payload: any
): Promise<void> {
  switch (event) {
    case 'callStarted':
      console.log('Call started:', payload.callId)
      break
    case 'callEnded':
      console.log('Call ended:', payload.callId)
      break
    case 'participantJoined':
      console.log('Participant joined:', payload.displayName)
      break
    case 'participantLeft':
      console.log('Participant left:', payload.displayName)
      break
    case 'recordingStarted':
      console.log('Recording started')
      break
    case 'recordingEnded':
      console.log('Recording ended')
      break
    default:
      console.log('Unknown Teams event:', event)
  }
}