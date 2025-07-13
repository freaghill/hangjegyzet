import { useState, useEffect, useCallback, useRef } from 'react'

interface TranscriptionProgress {
  status: 'pending' | 'processing' | 'transcribed' | 'failed'
  progress: number
  jobId?: string
  result?: {
    duration?: number
    wordCount?: number
    processingTime?: number
  }
  error?: string
  timestamp: string
}

interface UseTranscriptionProgressOptions {
  meetingId: string
  onComplete?: (result: TranscriptionProgress['result']) => void
  onError?: (error: string) => void
  enabled?: boolean
}

export function useTranscriptionProgress({
  meetingId,
  onComplete,
  onError,
  enabled = true
}: UseTranscriptionProgressOptions) {
  const [progress, setProgress] = useState<TranscriptionProgress>({
    status: 'pending',
    progress: 0,
    timestamp: new Date().toISOString()
  })
  const [isConnected, setIsConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    if (!enabled || !meetingId || eventSourceRef.current) return

    try {
      const eventSource = new EventSource(
        `/api/meetings/${meetingId}/transcription-progress`
      )
      eventSourceRef.current = eventSource

      eventSource.onopen = () => {
        setIsConnected(true)
        reconnectAttemptsRef.current = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as TranscriptionProgress
          setProgress(data)

          if (data.status === 'transcribed' && data.result && onComplete) {
            onComplete(data.result)
          } else if (data.status === 'failed' && onError) {
            onError(data.error || 'Transcription failed')
          }

          // Close connection if transcription is complete
          if (data.status === 'transcribed' || data.status === 'failed') {
            eventSource.close()
            eventSourceRef.current = null
            setIsConnected(false)
          }
        } catch (error) {
          console.error('Error parsing progress data:', error)
        }
      }

      eventSource.onerror = () => {
        setIsConnected(false)
        eventSource.close()
        eventSourceRef.current = null

        // Implement exponential backoff for reconnection
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectAttemptsRef.current++
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        }
      }
    } catch (error) {
      console.error('Error connecting to progress stream:', error)
      setIsConnected(false)
    }
  }, [meetingId, enabled, onComplete, onError])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (enabled) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [enabled, connect, disconnect])

  const retry = useCallback(() => {
    disconnect()
    reconnectAttemptsRef.current = 0
    connect()
  }, [connect, disconnect])

  return {
    ...progress,
    isConnected,
    retry
  }
}