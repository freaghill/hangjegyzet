import { useState, useCallback } from 'react'
import { toast } from 'sonner'

export interface EnhancedTranscriptionOptions {
  startTime?: number
  endTime?: number
  language?: string
  enablePreprocessing?: boolean
  enableMultiPass?: boolean
  enableVocabularyEnhancement?: boolean
  enableAccuracyMonitoring?: boolean
  multiPassCount?: number
  temperatures?: number[]
  speakerCount?: number
  customVocabulary?: string[]
  contextHints?: string[]
  minAudioQuality?: 'poor' | 'fair' | 'good' | 'excellent'
  minConfidenceScore?: number
}

export interface TranscriptionStatus {
  status: 'idle' | 'processing' | 'completed' | 'failed'
  progress?: number
  metadata?: any
  error?: string
}

export interface TranscriptionResult {
  text: string
  segments: Array<{
    id: number
    start: number
    end: number
    text: string
    speaker?: string
    confidence?: number
  }>
  metadata: {
    duration: number
    language: string
    audioQuality: string
    processingTime: number
    enhancementsApplied: string[]
    vocabularyMatches: number
    confidence: number
    passCount?: number
  }
  warnings?: string[]
}

export function useEnhancedTranscription() {
  const [status, setStatus] = useState<TranscriptionStatus>({ status: 'idle' })
  const [result, setResult] = useState<TranscriptionResult | null>(null)

  const startTranscription = useCallback(async (
    meetingId: string,
    options: EnhancedTranscriptionOptions = {}
  ) => {
    setStatus({ status: 'processing', progress: 0 })
    setResult(null)

    try {
      const response = await fetch('/api/transcription/enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId,
          ...options,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed')
      }

      // Start polling for status
      const pollInterval = setInterval(async () => {
        const statusResponse = await fetch(`/api/transcription/enhanced?meetingId=${meetingId}`)
        const statusData = await statusResponse.json()

        if (statusData.status === 'processing' && statusData.metadata?.processingProgress) {
          setStatus({
            status: 'processing',
            progress: statusData.metadata.processingProgress,
            metadata: statusData.metadata
          })
        } else if (statusData.status === 'completed') {
          clearInterval(pollInterval)
          setStatus({ status: 'completed' })
          setResult(data)
          
          // Show warnings if any
          if (data.warnings && data.warnings.length > 0) {
            data.warnings.forEach((warning: string) => {
              toast.warning(warning)
            })
          }
          
          // Show success message with stats
          const enhancementsText = data.metadata.enhancementsApplied.join(', ')
          toast.success(
            `Transcription completed in ${data.metadata.processingTime.toFixed(1)}s with ${data.metadata.confidence * 100}% confidence. Enhancements: ${enhancementsText}`
          )
        } else if (statusData.status === 'failed') {
          clearInterval(pollInterval)
          setStatus({ 
            status: 'failed', 
            error: statusData.error || 'Transcription failed' 
          })
          toast.error(statusData.error || 'Transcription failed')
        }
      }, 2000) // Poll every 2 seconds

      // Set a timeout to stop polling after 10 minutes
      setTimeout(() => {
        clearInterval(pollInterval)
        if (status.status === 'processing') {
          setStatus({ 
            status: 'failed', 
            error: 'Transcription timeout' 
          })
          toast.error('Transcription timeout - please try again')
        }
      }, 600000)

    } catch (error) {
      setStatus({ 
        status: 'failed', 
        error: error instanceof Error ? error.message : 'Failed to start transcription' 
      })
      toast.error(error instanceof Error ? error.message : 'Failed to start transcription')
    }
  }, [status.status])

  const provideFeedback = useCallback(async (
    meetingId: string,
    corrections: Array<{
      originalText: string
      correctedText: string
      startTime?: number
      endTime?: number
    }>
  ) => {
    try {
      const response = await fetch('/api/transcription/enhanced', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId,
          corrections,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit feedback')
      }

      toast.success('Feedback submitted successfully. The system will learn from your corrections.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit feedback')
      throw error
    }
  }, [])

  const reset = useCallback(() => {
    setStatus({ status: 'idle' })
    setResult(null)
  }, [])

  return {
    status,
    result,
    startTranscription,
    provideFeedback,
    reset,
  }
}

// Helper hook for transcription quality monitoring
export function useTranscriptionQuality(meetingId?: string) {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const generateReport = useCallback(async (
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) => {
    setLoading(true)
    try {
      const response = await fetch('/api/transcription/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const data = await response.json()
      setReport(data)
      return data
    } catch (error) {
      toast.error('Failed to generate quality report')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    report,
    loading,
    generateReport,
  }
}