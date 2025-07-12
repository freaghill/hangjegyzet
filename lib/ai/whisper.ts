import { OpenAI } from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface TranscriptionResult {
  text: string
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
  language?: string
  duration?: number
}

export async function transcribeAudio(
  audioFile: File | Blob,
  language: string = 'hu'
): Promise<TranscriptionResult> {
  try {
    // Create form data for OpenAI API
    const formData = new FormData()
    formData.append('file', audioFile)
    formData.append('model', 'whisper-1')
    formData.append('language', language)
    formData.append('response_format', 'verbose_json')
    
    // Add Hungarian context to improve accuracy
    if (language === 'hu') {
      formData.append('prompt', `
        Ez egy magyar nyelvű üzleti megbeszélés. 
        Gyakori szavak: projekt, meeting, deadline, budget, stakeholder, 
        milestone, delivery, sprint, KPI, OKR, CEO, CTO, CFO.
        Magyar cégnevek és rövidítések: Kft., Zrt., Bt., GDPR, ÁFA.
      `.trim())
    }

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Transcription failed')
    }

    const result = await response.json()

    return {
      text: result.text,
      segments: result.segments,
      language: result.language,
      duration: result.duration,
    }
  } catch (error) {
    console.error('Transcription error:', error)
    throw error
  }
}

// Post-process Hungarian transcription to fix common errors
export function postProcessHungarianTranscript(text: string): string {
  // Common corrections for Hungarian business terms
  const corrections: Record<string, string> = {
    // Fix common Whisper mistakes
    'meting': 'meeting',
    'dedlájn': 'deadline',
    'stek holder': 'stakeholder',
    'bádzset': 'budget',
    'kft': 'Kft.',
    'zrt': 'Zrt.',
    'kápi': 'KPI',
    'okr': 'OKR',
    
    // Fix Hungarian-specific issues
    'az mond': 'azt mond',
    'as szerint': 'az szerint',
    
    // Common company names
    'otp': 'OTP',
    'mol': 'MOL',
    'telekom': 'Telekom',
  }

  let processedText = text

  // Apply corrections
  Object.entries(corrections).forEach(([wrong, correct]) => {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi')
    processedText = processedText.replace(regex, correct)
  })

  // Fix punctuation issues
  processedText = processedText
    .replace(/\s+([.,!?;:])/g, '$1') // Remove space before punctuation
    .replace(/([.,!?;:])\s*$/g, '$1') // Ensure proper ending
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  return processedText
}

// Extract speakers from transcript (basic implementation)
export function extractSpeakers(
  segments: TranscriptionResult['segments']
): string[] {
  if (!segments) return []

  // This is a simplified version - in production you'd use
  // speaker diarization models
  const speakers = new Set<string>()
  
  // For now, we'll just identify potential speaker changes
  // based on long pauses or certain patterns
  segments.forEach((segment, index) => {
    if (index === 0 || (segment.start - segments[index - 1].end > 2)) {
      // Potential speaker change
      speakers.add(`Speaker ${speakers.size + 1}`)
    }
  })

  return Array.from(speakers)
}