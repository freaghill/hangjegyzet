'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'

interface TranscriptionSegment {
  id: string
  text: string
  speaker: string
  timestamp: number
  confidence: number
}

interface UseRealtimeTranscriptionOptions {
  meetingId: string
  onTranscription?: (segment: TranscriptionSegment) => void
  onError?: (error: Error) => void
}

export function useRealtimeTranscription({
  meetingId,
  onTranscription,
  onError
}: UseRealtimeTranscriptionOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptionSegment[]>([])
  
  const socketRef = useRef<Socket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Initialize WebSocket connection
  const connectWebSocket = useCallback(async () => {
    try {
      // Get auth token
      const response = await fetch('/api/auth/session')
      const session = await response.json()
      
      if (!session?.user) {
        throw new Error('Not authenticated')
      }

      // Connect to WebSocket server
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
        (process.env.NODE_ENV === 'development' ? 'ws://localhost:3002' : 'ws://localhost:3001')
      console.log('Connecting to WebSocket:', wsUrl)
      
      const socket = io(wsUrl, {
        auth: process.env.NODE_ENV === 'development' ? {} : {
          token: session.access_token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })

      socket.on('connect', () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        
        // Join meeting room
        socket.emit('join-meeting', { 
          meetingId, 
          role: 'participant' 
        })
      })

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason)
        setIsConnected(false)
      })

      socket.on('error', (error) => {
        console.error('WebSocket error:', error)
        onError?.(new Error(error.message))
      })

      socket.on('transcription-chunk', (chunk: TranscriptionSegment) => {
        setTranscript(prev => [...prev, chunk])
        onTranscription?.(chunk)
      })

      socket.on('meeting-joined', (data) => {
        console.log('Joined meeting:', data)
        toast.success('Connected to meeting')
      })

      socketRef.current = socket
    } catch (error) {
      console.error('WebSocket connection error:', error)
      onError?.(error as Error)
      toast.error('Failed to connect to real-time service')
    }
  }, [meetingId, onTranscription, onError])

  // Start recording audio
  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      })

      streamRef.current = stream

      // Create audio context for processing
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000
      })

      const source = audioContextRef.current.createMediaStreamSource(stream)

      // Option 1: Use MediaRecorder for chunks (simpler, more reliable)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      })

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
          
          // Send audio chunk every 1 second
          if (chunksRef.current.length >= 10) { // 10 * 100ms = 1 second
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
            chunksRef.current = []
            
            // Send to server via HTTP (more reliable than WebSocket for binary data)
            await sendAudioChunk(audioBlob)
          }
        }
      }

      // Record in 100ms chunks
      mediaRecorder.start(100)
      mediaRecorderRef.current = mediaRecorder

      // Notify server that recording started
      if (socketRef.current?.connected) {
        socketRef.current.emit('start-recording')
      }

      setIsRecording(true)
      toast.success('Recording started')
    } catch (error) {
      console.error('Failed to start recording:', error)
      onError?.(error as Error)
      toast.error('Failed to access microphone')
    }
  }, [onError])

  // Send audio chunk to server
  const sendAudioChunk = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.webm')

      // Use test endpoint in development
      const endpoint = process.env.NODE_ENV === 'development' 
        ? '/api/realtime/audio/test' 
        : '/api/realtime/audio'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'X-Meeting-ID': meetingId,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to send audio chunk')
      }

      const result = await response.json()
      
      // In test mode, add transcription directly
      if (result.mode === 'test' && result.transcription) {
        console.log('Test transcription:', result.transcription)
        setTranscript(prev => {
          const updated = [...prev, result.transcription]
          // Limit transcript array to prevent memory leak
          if (updated.length > 1000) {
            return updated.slice(-1000)
          }
          return updated
        })
        onTranscription?.(result.transcription)
      } else if (result.transcription) {
        // Production mode - transcription comes through WebSocket
        console.log('Chunk processed:', result.transcription)
      }
    } catch (error) {
      console.error('Failed to send audio chunk:', error)
      // Don't stop recording on individual chunk failures
    }
  }, [meetingId])

  // Stop recording
  const stopRecording = useCallback(() => {
    try {
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
        
        // Process any remaining chunks
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
          sendAudioChunk(audioBlob)
          chunksRef.current = []
        }
      }

      // Stop audio tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }

      // Close audio context
      if (audioContextRef.current) {
        audioContextRef.current.close()
        audioContextRef.current = null
      }

      // Notify server
      if (socketRef.current?.connected) {
        socketRef.current.emit('stop-recording')
      }

      setIsRecording(false)
      toast.success('Recording stopped')
    } catch (error) {
      console.error('Failed to stop recording:', error)
      onError?.(error as Error)
    }
  }, [sendAudioChunk, onError])

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (isRecording) {
      stopRecording()
    }

    if (socketRef.current) {
      socketRef.current.emit('leave-meeting')
      socketRef.current.disconnect()
      socketRef.current = null
    }

    setIsConnected(false)
  }, [isRecording, stopRecording])

  // Initialize connection on mount
  useEffect(() => {
    connectWebSocket()

    return () => {
      disconnect()
    }
  }, []) // Only run on mount/unmount

  // Export transcript
  const exportTranscript = useCallback(() => {
    const text = transcript
      .map(segment => `[${new Date(segment.timestamp).toLocaleTimeString()}] ${segment.speaker}: ${segment.text}`)
      .join('\n')
    
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript-${meetingId}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }, [transcript, meetingId])

  return {
    // State
    isRecording,
    isConnected,
    transcript,
    
    // Actions
    startRecording,
    stopRecording,
    disconnect,
    exportTranscript,
    
    // Utilities
    clearTranscript: () => setTranscript([]),
  }
}