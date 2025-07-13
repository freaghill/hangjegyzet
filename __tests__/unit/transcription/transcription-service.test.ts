import { TranscriptionService } from '@/lib/transcription/transcription-service'
import { OpenAI } from 'openai'
import { createClient } from '@supabase/supabase-js'
import { Queue } from 'bullmq'
import { createMockFile, mockSuccessResponse, mockErrorResponse } from '@/__tests__/test-utils'

jest.mock('openai')
jest.mock('@supabase/supabase-js')
jest.mock('bullmq')

describe('TranscriptionService', () => {
  let transcriptionService: TranscriptionService
  let mockOpenAI: any
  let mockSupabaseClient: any
  let mockQueue: jest.Mocked<Queue>

  beforeEach(() => {
    mockOpenAI = {
      audio: {
        transcriptions: {
          create: jest.fn(),
        },
      },
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    }

    mockSupabaseClient = {
      from: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
      })),
      storage: {
        from: jest.fn(() => ({
          download: jest.fn(),
        })),
      },
    }

    mockQueue = {
      add: jest.fn(),
      close: jest.fn(),
    } as any

    ;(OpenAI as jest.Mock).mockImplementation(() => mockOpenAI)
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    ;(Queue as jest.Mock).mockImplementation(() => mockQueue)

    transcriptionService = new TranscriptionService()
  })

  describe('transcribeFile', () => {
    it('should transcribe audio file successfully', async () => {
      const fileUrl = 'https://example.com/test.mp3'
      const meetingId = 'test-meeting-id'
      const mode = 'balanced'
      const audioBlob = new Blob(['audio data'])

      // Mock file download
      mockSupabaseClient.storage.from().download.mockResolvedValue(
        mockSuccessResponse(audioBlob)
      )

      // Mock OpenAI transcription
      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: 'This is a test transcription.',
        duration: 60,
        language: 'hu',
      })

      // Mock database operations
      mockSupabaseClient.from().insert().single.mockResolvedValue(
        mockSuccessResponse({ id: 'transcription-id' })
      )
      mockSupabaseClient.from().update().eq().mockResolvedValue(
        mockSuccessResponse(null)
      )

      const result = await transcriptionService.transcribeFile(fileUrl, meetingId, mode)

      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith({
        file: expect.any(File),
        model: 'whisper-1',
        language: 'hu',
        response_format: 'verbose_json',
        temperature: 0.2, // balanced mode
      })

      expect(result.text).toBe('This is a test transcription.')
      expect(result.language).toBe('hu')
      expect(result.duration).toBe(60)
      expect(result.error).toBeNull()
    })

    it('should handle different transcription modes', async () => {
      const fileUrl = 'https://example.com/test.mp3'
      const meetingId = 'test-meeting-id'
      const audioBlob = new Blob(['audio data'])

      mockSupabaseClient.storage.from().download.mockResolvedValue(
        mockSuccessResponse(audioBlob)
      )

      mockOpenAI.audio.transcriptions.create.mockResolvedValue({
        text: 'Test',
        duration: 60,
        language: 'hu',
      })

      // Test fast mode
      await transcriptionService.transcribeFile(fileUrl, meetingId, 'fast')
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.5 })
      )

      // Test precise mode
      await transcriptionService.transcribeFile(fileUrl, meetingId, 'precise')
      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0 })
      )
    })

    it('should handle file download errors', async () => {
      const fileUrl = 'https://example.com/missing.mp3'
      const meetingId = 'test-meeting-id'

      mockSupabaseClient.storage.from().download.mockResolvedValue(
        mockErrorResponse('File not found')
      )

      const result = await transcriptionService.transcribeFile(fileUrl, meetingId, 'balanced')

      expect(result.text).toBeNull()
      expect(result.error).toContain('Failed to download file')
      expect(mockOpenAI.audio.transcriptions.create).not.toHaveBeenCalled()
    })

    it('should handle OpenAI API errors', async () => {
      const fileUrl = 'https://example.com/test.mp3'
      const meetingId = 'test-meeting-id'
      const audioBlob = new Blob(['audio data'])

      mockSupabaseClient.storage.from().download.mockResolvedValue(
        mockSuccessResponse(audioBlob)
      )

      mockOpenAI.audio.transcriptions.create.mockRejectedValue(
        new Error('API rate limit exceeded')
      )

      const result = await transcriptionService.transcribeFile(fileUrl, meetingId, 'balanced')

      expect(result.text).toBeNull()
      expect(result.error).toContain('API rate limit exceeded')
    })

    it('should handle large files by splitting', async () => {
      const fileUrl = 'https://example.com/large.mp3'
      const meetingId = 'test-meeting-id'
      
      // Create a large blob (over 25MB limit)
      const largeBlob = new Blob([new ArrayBuffer(30 * 1024 * 1024)])

      mockSupabaseClient.storage.from().download.mockResolvedValue(
        mockSuccessResponse(largeBlob)
      )

      // Mock split transcriptions
      mockOpenAI.audio.transcriptions.create
        .mockResolvedValueOnce({ text: 'Part 1', duration: 30, language: 'hu' })
        .mockResolvedValueOnce({ text: 'Part 2', duration: 30, language: 'hu' })

      mockSupabaseClient.from().insert().single.mockResolvedValue(
        mockSuccessResponse({ id: 'transcription-id' })
      )

      const result = await transcriptionService.transcribeFile(fileUrl, meetingId, 'balanced')

      expect(mockOpenAI.audio.transcriptions.create).toHaveBeenCalledTimes(2)
      expect(result.text).toContain('Part 1')
      expect(result.text).toContain('Part 2')
    })
  })

  describe('queueTranscription', () => {
    it('should queue transcription job', async () => {
      const meetingId = 'test-meeting-id'
      const fileUrl = 'https://example.com/test.mp3'
      const mode = 'balanced'

      mockQueue.add.mockResolvedValue({ id: 'job-id' } as any)

      const result = await transcriptionService.queueTranscription(meetingId, fileUrl, mode)

      expect(mockQueue.add).toHaveBeenCalledWith(
        'transcribe',
        { meetingId, fileUrl, mode },
        expect.objectContaining({
          priority: 5,
          removeOnComplete: true,
          removeOnFail: false,
        })
      )
      expect(result.jobId).toBe('job-id')
      expect(result.error).toBeNull()
    })

    it('should set priority based on mode', async () => {
      const meetingId = 'test-meeting-id'
      const fileUrl = 'https://example.com/test.mp3'

      mockQueue.add.mockResolvedValue({ id: 'job-id' } as any)

      // Test precise mode (higher priority)
      await transcriptionService.queueTranscription(meetingId, fileUrl, 'precise')
      expect(mockQueue.add).toHaveBeenCalledWith(
        'transcribe',
        expect.any(Object),
        expect.objectContaining({ priority: 10 })
      )

      // Test fast mode (lower priority)
      await transcriptionService.queueTranscription(meetingId, fileUrl, 'fast')
      expect(mockQueue.add).toHaveBeenCalledWith(
        'transcribe',
        expect.any(Object),
        expect.objectContaining({ priority: 1 })
      )
    })
  })

  describe('generateSummary', () => {
    it('should generate meeting summary', async () => {
      const transcription = 'This is a test meeting about project updates.'
      const expectedSummary = 'Meeting discussed project updates and timeline.'

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: { content: expectedSummary }
        }]
      })

      const result = await transcriptionService.generateSummary(transcription)

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user', content: expect.stringContaining(transcription) })
        ]),
        temperature: 0.3,
        max_tokens: 500,
      })

      expect(result.summary).toBe(expectedSummary)
      expect(result.error).toBeNull()
    })

    it('should handle summary generation errors', async () => {
      const transcription = 'Test meeting content'

      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API error')
      )

      const result = await transcriptionService.generateSummary(transcription)

      expect(result.summary).toBeNull()
      expect(result.error).toContain('API error')
    })
  })

  describe('extractKeyPoints', () => {
    it('should extract key points from transcription', async () => {
      const transcription = 'Meeting about deadlines, budget review, and team assignments.'
      const expectedKeyPoints = [
        'Project deadline set for next month',
        'Budget needs review and approval',
        'Team assignments finalized'
      ]

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: { content: JSON.stringify(expectedKeyPoints) }
        }]
      })

      const result = await transcriptionService.extractKeyPoints(transcription)

      expect(result.keyPoints).toEqual(expectedKeyPoints)
      expect(result.error).toBeNull()
    })

    it('should handle invalid JSON response', async () => {
      const transcription = 'Test content'

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: { content: 'Not valid JSON' }
        }]
      })

      const result = await transcriptionService.extractKeyPoints(transcription)

      expect(result.keyPoints).toEqual([])
      expect(result.error).toBe(null) // Gracefully handles parsing errors
    })
  })

  describe('identifySpeakers', () => {
    it('should identify speakers in transcription', async () => {
      const transcription = `
        John: Hello everyone, let's start the meeting.
        Mary: Thanks John, I have the reports ready.
        John: Great, please share them.
      `
      const expectedSpeakers = [
        { name: 'John', segments: 2 },
        { name: 'Mary', segments: 1 }
      ]

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: { content: JSON.stringify(expectedSpeakers) }
        }]
      })

      const result = await transcriptionService.identifySpeakers(transcription)

      expect(result.speakers).toEqual(expectedSpeakers)
      expect(result.error).toBeNull()
    })
  })

  describe('getTranscriptionStatus', () => {
    it('should return transcription status', async () => {
      const transcriptionId = 'test-transcription-id'
      const mockTranscription = {
        id: transcriptionId,
        status: 'processing',
        progress: 45,
        created_at: new Date().toISOString()
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse(mockTranscription)
      )

      const result = await transcriptionService.getTranscriptionStatus(transcriptionId)

      expect(result.status).toBe('processing')
      expect(result.progress).toBe(45)
      expect(result.error).toBeNull()
    })

    it('should handle not found errors', async () => {
      const transcriptionId = 'non-existent-id'

      mockSupabaseClient.from().select().eq().single.mockResolvedValue(
        mockErrorResponse('Not found')
      )

      const result = await transcriptionService.getTranscriptionStatus(transcriptionId)

      expect(result.status).toBeNull()
      expect(result.error).toBe('Not found')
    })
  })
})