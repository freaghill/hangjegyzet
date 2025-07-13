import { useState, useCallback } from 'react'

export type TranscriptionMode = 'standard' | 'enhanced' | 'realtime'

interface UseTranscriptionModeReturn {
  mode: TranscriptionMode
  setMode: (mode: TranscriptionMode) => void
  isRealtime: boolean
  isEnhanced: boolean
  getConfig: () => {
    model: string
    language?: string
    enhancedAccuracy: boolean
    speakerDiarization: boolean
    punctuation: boolean
    profanityFilter: boolean
  }
}

export function useTranscriptionMode(defaultMode: TranscriptionMode = 'standard'): UseTranscriptionModeReturn {
  const [mode, setMode] = useState<TranscriptionMode>(defaultMode)

  const isRealtime = mode === 'realtime'
  const isEnhanced = mode === 'enhanced'

  const getConfig = useCallback(() => {
    switch (mode) {
      case 'realtime':
        return {
          model: 'whisper-1',
          enhancedAccuracy: false,
          speakerDiarization: true,
          punctuation: true,
          profanityFilter: false
        }
      case 'enhanced':
        return {
          model: 'whisper-large-v3',
          language: 'hu',
          enhancedAccuracy: true,
          speakerDiarization: true,
          punctuation: true,
          profanityFilter: false
        }
      default:
        return {
          model: 'whisper-1',
          language: 'hu',
          enhancedAccuracy: false,
          speakerDiarization: true,
          punctuation: true,
          profanityFilter: false
        }
    }
  }, [mode])

  return {
    mode,
    setMode,
    isRealtime,
    isEnhanced,
    getConfig
  }
}