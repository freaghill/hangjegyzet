import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import { AudioProcessor } from '@/lib/realtime/audio-processor'
import { toast } from 'sonner'

interface TranscriptionChunk {
  id: string
  meetingId: string
  text: string
  speaker?: string
  timestamp: number
  confidence: number
  isFinal: boolean
  sentiment?: 'positive' | 'neutral' | 'negative'
  keywords?: string[]
  actionItems?: string[]
  decisions?: string[]
}

interface AudioMetrics {
  level: number
  peakLevel: number
  noiseLevel: number
  clipping: boolean
  voiceActivity: boolean
  signalToNoise: number
}

interface UseRealtimeTranscriptionOptions {
  meetingId: string
  onTranscription?: (chunk: TranscriptionChunk) => void
  onMetrics?: (metrics: AudioMetrics) => void
  onError?: (error: Error) => void
  onStatusChange?: (status: ConnectionStatus) => void
  autoReconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'

export function useRealtimeTranscription({
  meetingId,
  onTranscription,
  onMetrics,
  onError,
  onStatusChange,
  autoReconnect = true,
  reconnectInterval = 1000,
  maxReconnectAttempts = 5,
}: UseRealtimeTranscriptionOptions) {
  const supabase = useSupabaseClient()
  const user = useUser()
  
  const [isRecording, setIsRecording] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [participants, setParticipants] = useState<string[]>([])
  const [transcriptionHistory, setTranscriptionHistory] = useState<TranscriptionChunk[]>([])
  const [audioLevel, setAudioLevel] = useState(0)
  
  const socketRef = useRef<Socket | null>(null)
  const audioProcessorRef = useRef<AudioProcessor | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Update connection status
  const updateStatus = useCallback((status: ConnectionStatus) => {
    setConnectionStatus(status)
    onStatusChange?.(status)
  }, [onStatusChange])
  
  // Connect to WebSocket server
  const connect = useCallback(async () => {
    if (!user || !meetingId) return
    
    try {
      updateStatus('connecting')
      
      // Get WebSocket connection details
      const response = await fetch('/api/realtime/connect', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to get WebSocket connection details')
      }
      
      const { wsUrl, token } = await response.json()
      
      // Connect to WebSocket server
      const socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket'],
        reconnection: autoReconnect,
        reconnectionDelay: reconnectInterval,
        reconnectionAttempts: maxReconnectAttempts,
      })
      
      socketRef.current = socket
      
      // Socket event handlers
      socket.on('connect', () => {
        console.log('Connected to WebSocket server')
        updateStatus('connected')
        reconnectAttemptsRef.current = 0
        
        // Join meeting room
        socket.emit('join-meeting', { meetingId })
      })
      
      socket.on('disconnect', (reason) => {
        console.log('Disconnected from WebSocket server:', reason)
        updateStatus('disconnected')
        
        if (autoReconnect && reason !== 'io client disconnect') {
          handleReconnect()
        }
      })
      
      socket.on('error', (error) => {
        console.error('WebSocket error:', error)
        updateStatus('error')
        onError?.(new Error(error.message || 'WebSocket error'))
      })
      
      socket.on('meeting-joined', (data) => {
        console.log('Joined meeting:', data)
        setParticipants(data.participants.map((p: any) => p.userId))
        setIsRecording(data.isRecording)
      })
      
      socket.on('participant-joined', (data) => {
        setParticipants(prev => [...prev, data.userId])
      })
      
      socket.on('participant-left', (data) => {
        setParticipants(prev => prev.filter(id => id !== data.userId))
      })
      
      socket.on('transcription-chunk', (chunk: TranscriptionChunk) => {
        setTranscriptionHistory(prev => [...prev, chunk])
        onTranscription?.(chunk)
      })
      
      socket.on('transcription-history', (chunks: TranscriptionChunk[]) => {
        setTranscriptionHistory(chunks)
      })
      
      socket.on('recording-started', () => {
        setIsRecording(true)
        toast.success('Recording started')
      })
      
      socket.on('recording-stopped', () => {
        setIsRecording(false)
        toast.info('Recording stopped')
      })
      
      socket.on('alert:negative_sentiment', (alert) => {
        toast.warning('Negative sentiment detected in the meeting')
      })
      
      socket.on('alert:action_items', (alert) => {
        toast.info(`New action items detected: ${alert.items.length}`)
      })
      
    } catch (error) {
      console.error('Connection error:', error)
      updateStatus('error')
      onError?.(error as Error)
      
      if (autoReconnect) {
        handleReconnect()
      }
    }
  }, [user, meetingId, supabase, updateStatus, onTranscription, onError, autoReconnect, reconnectInterval, maxReconnectAttempts])
  
  // Handle reconnection
  const handleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      updateStatus('error')
      onError?.(new Error('Max reconnection attempts reached'))
      return
    }
    
    reconnectAttemptsRef.current++
    updateStatus('reconnecting')
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect()
    }, reconnectInterval * reconnectAttemptsRef.current)
  }, [connect, maxReconnectAttempts, reconnectInterval, updateStatus, onError])
  
  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (socketRef.current) {
      socketRef.current.emit('leave-meeting')
      socketRef.current.disconnect()
      socketRef.current = null
    }
    
    updateStatus('disconnected')
  }, [updateStatus])
  
  // Start recording
  const startRecording = useCallback(async () => {
    if (!socketRef.current || !socketRef.current.connected) {
      throw new Error('Not connected to server')
    }
    
    try {
      // Initialize audio processor
      const audioProcessor = new AudioProcessor({
        sampleRate: 16000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      })
      
      await audioProcessor.initialize()
      audioProcessorRef.current = audioProcessor
      
      // Start audio processing
      audioProcessor.start(
        // On audio chunk
        async (chunk) => {
          // Send to server via WebSocket
          socketRef.current?.emit('audio-chunk', {
            chunk: chunk.data.buffer,
            timestamp: chunk.timestamp,
          })
        },
        // On metrics update
        (metrics) => {
          setAudioLevel(metrics.level)
          onMetrics?.(metrics)
        },
        // On error
        (error) => {
          console.error('Audio processor error:', error)
          onError?.(error)
        }
      )
      
      // Notify server to start recording
      socketRef.current.emit('start-recording')
      
    } catch (error) {
      console.error('Failed to start recording:', error)
      onError?.(error as Error)
      throw error
    }
  }, [onMetrics, onError])
  
  // Stop recording
  const stopRecording = useCallback(() => {
    if (audioProcessorRef.current) {
      audioProcessorRef.current.stop()
      audioProcessorRef.current = null
    }
    
    if (socketRef.current?.connected) {
      socketRef.current.emit('stop-recording')
    }
    
    setAudioLevel(0)
  }, [])
  
  // Request resync
  const requestResync = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('request-resync')
    }
  }, [])
  
  // Add manual transcript
  const addManualTranscript = useCallback(async (text: string, speaker?: string) => {
    if (!meetingId) return
    
    try {
      const response = await fetch('/api/realtime/transcript', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          meetingId,
          text,
          speaker,
          timestamp: Date.now(),
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to add manual transcript')
      }
      
      const { segment } = await response.json()
      return segment
    } catch (error) {
      console.error('Failed to add manual transcript:', error)
      onError?.(error as Error)
      throw error
    }
  }, [meetingId, supabase, onError])
  
  // Effect to connect on mount
  useEffect(() => {
    if (user && meetingId) {
      connect()
    }
    
    return () => {
      disconnect()
      if (audioProcessorRef.current) {
        audioProcessorRef.current.stop()
      }
    }
  }, [user, meetingId]) // eslint-disable-line react-hooks/exhaustive-deps
  
  return {
    // State
    isRecording,
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    participants,
    transcriptionHistory,
    audioLevel,
    
    // Actions
    connect,
    disconnect,
    startRecording,
    stopRecording,
    requestResync,
    addManualTranscript,
  }
}