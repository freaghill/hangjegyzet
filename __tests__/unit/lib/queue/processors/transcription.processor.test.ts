import { processTranscription } from '@/lib/queue/processors/transcription.processor'
import { createClient } from '@/lib/supabase/admin'
import { openai } from '@/lib/ai/openai'
import { deepgram } from '@/lib/ai/deepgram'
import fs from 'fs/promises'

jest.mock('@/lib/supabase/admin')
jest.mock('@/lib/ai/openai')
jest.mock('@/lib/ai/deepgram')
jest.mock('fs/promises')

describe('TranscriptionProcessor', () => {
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
  }

  const mockJob = {
    data: {
      meetingId: 'test-meeting-id',
      filePath: '/tmp/test-audio.mp3',
      userId: 'test-user-id',
      organizationId: 'test-org-id',
      mode: 'balanced',
      language: 'hu',
    },
    updateProgress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('audio-data'))
  })

  it('should process transcription with OpenAI Whisper', async () => {
    const mockTranscriptionResponse = {
      text: 'Ez egy teszt átirat.',
      segments: [
        {
          text: 'Ez egy teszt átirat.',
          start: 0,
          end: 3,
          speaker: 'Speaker 1',
        },
      ],
    }

    ;(openai.audio.transcriptions.create as jest.Mock).mockResolvedValue(mockTranscriptionResponse)
    
    mockSupabase.single.mockResolvedValue({ data: null, error: null })

    await processTranscription(mockJob as any)

    expect(mockJob.updateProgress).toHaveBeenCalledWith(10)
    expect(mockJob.updateProgress).toHaveBeenCalledWith(30)
    expect(mockJob.updateProgress).toHaveBeenCalledWith(80)
    expect(mockJob.updateProgress).toHaveBeenCalledWith(100)

    expect(openai.audio.transcriptions.create).toHaveBeenCalledWith({
      file: expect.any(Object),
      model: 'whisper-1',
      language: 'hu',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })

    expect(mockSupabase.update).toHaveBeenCalledWith({
      status: 'completed',
      processed_at: expect.any(Date),
    })

    expect(mockSupabase.insert).toHaveBeenCalledWith({
      meeting_id: 'test-meeting-id',
      content: 'Ez egy teszt átirat.',
      language: 'hu',
      confidence_score: expect.any(Number),
      word_timestamps: expect.any(Object),
    })
  })

  it('should handle Deepgram processing for precision mode', async () => {
    const mockDeepgramResponse = {
      results: {
        channels: [{
          alternatives: [{
            transcript: 'Precíziós átirat teszt.',
            confidence: 0.95,
            words: [
              { word: 'Precíziós', start: 0, end: 1, confidence: 0.96 },
              { word: 'átirat', start: 1, end: 2, confidence: 0.94 },
              { word: 'teszt', start: 2, end: 3, confidence: 0.95 },
            ],
          }],
        }],
      },
    }

    mockJob.data.mode = 'precision'
    ;(deepgram.transcription.preRecorded as jest.Mock).mockResolvedValue(mockDeepgramResponse)
    
    mockSupabase.single.mockResolvedValue({ data: null, error: null })

    await processTranscription(mockJob as any)

    expect(deepgram.transcription.preRecorded).toHaveBeenCalledWith(
      expect.any(Buffer),
      {
        punctuate: true,
        diarize: true,
        language: 'hu',
        model: 'nova-2',
        smart_format: true,
      }
    )

    expect(mockSupabase.insert).toHaveBeenCalledWith({
      meeting_id: 'test-meeting-id',
      content: 'Precíziós átirat teszt.',
      language: 'hu',
      confidence_score: 0.95,
      word_timestamps: expect.any(Object),
    })
  })

  it('should handle transcription errors', async () => {
    const error = new Error('Transcription failed')
    ;(openai.audio.transcriptions.create as jest.Mock).mockRejectedValue(error)

    await expect(processTranscription(mockJob as any)).rejects.toThrow('Transcription failed')

    expect(mockSupabase.update).toHaveBeenCalledWith({
      status: 'failed',
      error: 'Transcription failed',
      processed_at: expect.any(Date),
    })
  })

  it('should clean up temporary files after processing', async () => {
    ;(openai.audio.transcriptions.create as jest.Mock).mockResolvedValue({
      text: 'Test',
      segments: [],
    })
    
    mockSupabase.single.mockResolvedValue({ data: null, error: null })
    ;(fs.unlink as jest.Mock).mockResolvedValue(undefined)

    await processTranscription(mockJob as any)

    expect(fs.unlink).toHaveBeenCalledWith('/tmp/test-audio.mp3')
  })

  it('should handle different processing modes correctly', async () => {
    const modes = ['fast', 'balanced', 'precision']
    
    for (const mode of modes) {
      jest.clearAllMocks()
      mockJob.data.mode = mode
      
      if (mode === 'precision') {
        ;(deepgram.transcription.preRecorded as jest.Mock).mockResolvedValue({
          results: { channels: [{ alternatives: [{ transcript: 'Test', confidence: 0.9 }] }] },
        })
      } else {
        ;(openai.audio.transcriptions.create as jest.Mock).mockResolvedValue({
          text: 'Test',
          segments: [],
        })
      }
      
      mockSupabase.single.mockResolvedValue({ data: null, error: null })

      await processTranscription(mockJob as any)

      if (mode === 'precision') {
        expect(deepgram.transcription.preRecorded).toHaveBeenCalled()
      } else {
        expect(openai.audio.transcriptions.create).toHaveBeenCalled()
      }
    }
  })
})