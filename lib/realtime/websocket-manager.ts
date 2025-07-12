import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { createClient } from '@supabase/supabase-js'
import { nanoid } from 'nanoid'

interface AuthenticatedSocket extends Socket {
  userId?: string
  organizationId?: string
  meetingId?: string
}

interface RoomState {
  meetingId: string
  participants: Map<string, ParticipantInfo>
  startTime: number
  isRecording: boolean
}

interface ParticipantInfo {
  userId: string
  socketId: string
  joinedAt: number
  role: 'host' | 'participant'
  isActive: boolean
}

interface TranscriptionChunk {
  id: string
  meetingId: string
  text: string
  speaker?: string
  timestamp: number
  confidence: number
  isFinal: boolean
}

export class WebSocketManager {
  private io: SocketIOServer
  private rooms: Map<string, RoomState> = new Map()
  private messageQueue: Map<string, TranscriptionChunk[]> = new Map()
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map()
  
  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB max buffer for audio chunks
    })
    
    this.setupEventHandlers()
    this.startHealthCheck()
  }
  
  private setupEventHandlers() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token
        if (!token) {
          return next(new Error('Authentication required'))
        }
        
        // Verify token with Supabase
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) {
          return next(new Error('Invalid authentication'))
        }
        
        // Get user's organization
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .single()
        
        if (!profile?.organization_id) {
          return next(new Error('No organization found'))
        }
        
        socket.userId = user.id
        socket.organizationId = profile.organization_id
        
        next()
      } catch (error) {
        next(new Error('Authentication failed'))
      }
    })
    
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`Client connected: ${socket.id}, User: ${socket.userId}`)
      
      // Clear any existing reconnect timer
      const timerId = this.reconnectTimers.get(socket.userId!)
      if (timerId) {
        clearTimeout(timerId)
        this.reconnectTimers.delete(socket.userId!)
      }
      
      socket.on('join-meeting', async (data: { meetingId: string; role?: string }) => {
        await this.handleJoinMeeting(socket, data)
      })
      
      socket.on('leave-meeting', async () => {
        await this.handleLeaveMeeting(socket)
      })
      
      socket.on('audio-chunk', async (data: { chunk: ArrayBuffer; timestamp: number }) => {
        await this.handleAudioChunk(socket, data)
      })
      
      socket.on('start-recording', async () => {
        await this.handleStartRecording(socket)
      })
      
      socket.on('stop-recording', async () => {
        await this.handleStopRecording(socket)
      })
      
      socket.on('request-resync', async () => {
        await this.handleResyncRequest(socket)
      })
      
      socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id}, Reason: ${reason}`)
        this.handleDisconnect(socket, reason)
      })
      
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error)
        socket.emit('error', { message: 'Connection error occurred' })
      })
    })
  }
  
  private async handleJoinMeeting(socket: AuthenticatedSocket, data: { meetingId: string; role?: string }) {
    const { meetingId, role = 'participant' } = data
    
    try {
      // Verify meeting exists and user has access
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('id, organization_id, status')
        .eq('id', meetingId)
        .eq('organization_id', socket.organizationId!)
        .single()
      
      if (error || !meeting) {
        socket.emit('error', { message: 'Meeting not found or access denied' })
        return
      }
      
      // Leave any existing meeting
      if (socket.meetingId) {
        await this.handleLeaveMeeting(socket)
      }
      
      // Join the new meeting room
      socket.join(meetingId)
      socket.meetingId = meetingId
      
      // Initialize or get room state
      if (!this.rooms.has(meetingId)) {
        this.rooms.set(meetingId, {
          meetingId,
          participants: new Map(),
          startTime: Date.now(),
          isRecording: false,
        })
      }
      
      const room = this.rooms.get(meetingId)!
      room.participants.set(socket.userId!, {
        userId: socket.userId!,
        socketId: socket.id,
        joinedAt: Date.now(),
        role: role as 'host' | 'participant',
        isActive: true,
      })
      
      // Send room state to the joining user
      socket.emit('meeting-joined', {
        meetingId,
        participants: Array.from(room.participants.values()),
        isRecording: room.isRecording,
        startTime: room.startTime,
      })
      
      // Notify other participants
      socket.to(meetingId).emit('participant-joined', {
        userId: socket.userId,
        role,
      })
      
      // Send any queued messages
      const queuedMessages = this.messageQueue.get(meetingId) || []
      if (queuedMessages.length > 0) {
        socket.emit('transcription-history', queuedMessages)
      }
      
    } catch (error) {
      console.error('Error joining meeting:', error)
      socket.emit('error', { message: 'Failed to join meeting' })
    }
  }
  
  private async handleLeaveMeeting(socket: AuthenticatedSocket) {
    if (!socket.meetingId) return
    
    const room = this.rooms.get(socket.meetingId)
    if (!room) return
    
    // Update participant status
    const participant = room.participants.get(socket.userId!)
    if (participant) {
      participant.isActive = false
    }
    
    // Leave the room
    socket.leave(socket.meetingId)
    
    // Notify other participants
    socket.to(socket.meetingId).emit('participant-left', {
      userId: socket.userId,
    })
    
    // Set reconnect timer
    const timerId = setTimeout(() => {
      // Remove participant after timeout
      room.participants.delete(socket.userId!)
      
      // Clean up empty rooms
      if (room.participants.size === 0) {
        this.rooms.delete(socket.meetingId!)
        this.messageQueue.delete(socket.meetingId!)
      }
    }, 30000) // 30 second grace period for reconnection
    
    this.reconnectTimers.set(socket.userId!, timerId)
    
    socket.meetingId = undefined
  }
  
  private async handleAudioChunk(socket: AuthenticatedSocket, data: { chunk: ArrayBuffer; timestamp: number }) {
    if (!socket.meetingId) {
      socket.emit('error', { message: 'Not in a meeting' })
      return
    }
    
    const room = this.rooms.get(socket.meetingId)
    if (!room || !room.isRecording) {
      socket.emit('error', { message: 'Recording not active' })
      return
    }
    
    try {
      // Forward to audio processing service
      this.io.to('audio-processors').emit('process-audio', {
        meetingId: socket.meetingId,
        userId: socket.userId,
        chunk: data.chunk,
        timestamp: data.timestamp,
      })
    } catch (error) {
      console.error('Error handling audio chunk:', error)
      socket.emit('error', { message: 'Failed to process audio' })
    }
  }
  
  private async handleStartRecording(socket: AuthenticatedSocket) {
    if (!socket.meetingId) {
      socket.emit('error', { message: 'Not in a meeting' })
      return
    }
    
    const room = this.rooms.get(socket.meetingId)
    if (!room) return
    
    // Check if user has permission (only hosts can start recording)
    const participant = room.participants.get(socket.userId!)
    if (!participant || participant.role !== 'host') {
      socket.emit('error', { message: 'Only hosts can start recording' })
      return
    }
    
    room.isRecording = true
    
    // Notify all participants
    this.io.to(socket.meetingId).emit('recording-started', {
      startedBy: socket.userId,
      timestamp: Date.now(),
    })
  }
  
  private async handleStopRecording(socket: AuthenticatedSocket) {
    if (!socket.meetingId) {
      socket.emit('error', { message: 'Not in a meeting' })
      return
    }
    
    const room = this.rooms.get(socket.meetingId)
    if (!room) return
    
    // Check if user has permission
    const participant = room.participants.get(socket.userId!)
    if (!participant || participant.role !== 'host') {
      socket.emit('error', { message: 'Only hosts can stop recording' })
      return
    }
    
    room.isRecording = false
    
    // Notify all participants
    this.io.to(socket.meetingId).emit('recording-stopped', {
      stoppedBy: socket.userId,
      timestamp: Date.now(),
    })
  }
  
  private async handleResyncRequest(socket: AuthenticatedSocket) {
    if (!socket.meetingId) return
    
    const queuedMessages = this.messageQueue.get(socket.meetingId) || []
    socket.emit('transcription-history', queuedMessages)
  }
  
  private handleDisconnect(socket: AuthenticatedSocket, reason: string) {
    // Don't immediately remove from meeting - they might reconnect
    if (socket.meetingId) {
      const room = this.rooms.get(socket.meetingId)
      if (room) {
        const participant = room.participants.get(socket.userId!)
        if (participant) {
          participant.isActive = false
        }
        
        // Notify others of temporary disconnect
        socket.to(socket.meetingId).emit('participant-disconnected', {
          userId: socket.userId,
          reason,
        })
      }
    }
  }
  
  // Public method to broadcast transcription chunks
  public broadcastTranscription(chunk: TranscriptionChunk) {
    const { meetingId } = chunk
    
    // Add to message queue for reliability
    if (!this.messageQueue.has(meetingId)) {
      this.messageQueue.set(meetingId, [])
    }
    
    const queue = this.messageQueue.get(meetingId)!
    queue.push(chunk)
    
    // Keep only last 1000 messages
    if (queue.length > 1000) {
      // Remove oldest messages to maintain limit
      queue.splice(0, queue.length - 1000)
    }
    
    // Broadcast to all participants in the meeting
    this.io.to(meetingId).emit('transcription-chunk', chunk)
  }
  
  // Health check to clean up stale connections
  private startHealthCheck() {
    setInterval(() => {
      for (const [meetingId, room] of this.rooms.entries()) {
        // Remove inactive participants
        for (const [userId, participant] of room.participants.entries()) {
          if (!participant.isActive) {
            const socket = this.io.sockets.sockets.get(participant.socketId)
            if (!socket || !socket.connected) {
              room.participants.delete(userId)
            }
          }
        }
        
        // Remove empty rooms
        if (room.participants.size === 0) {
          this.rooms.delete(meetingId)
          this.messageQueue.delete(meetingId)
        }
      }
    }, 60000) // Run every minute
  }
  
  // Get WebSocket server instance
  public getServer(): SocketIOServer {
    return this.io
  }
  
  // Get room information
  public getRoom(meetingId: string): RoomState | undefined {
    return this.rooms.get(meetingId)
  }
}

// Singleton instance
let webSocketManager: WebSocketManager | null = null

export function initializeWebSocketManager(server: HTTPServer): WebSocketManager {
  if (!webSocketManager) {
    webSocketManager = new WebSocketManager(server)
  }
  return webSocketManager
}

export function getWebSocketManager(): WebSocketManager {
  if (!webSocketManager) {
    throw new Error('WebSocket manager not initialized')
  }
  return webSocketManager
}