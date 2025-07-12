import { Job } from 'bullmq'
import { processTranscription } from '@/lib/queue/processors/transcription.processor'
import { createMockSupabaseClient, mockTableResponse } from '@/test/utils/supabase-mock'
import { createMockMeeting, createMockTranscriptionJob } from '@/test/utils/factories'
import { emailService } from '@/lib/email/sendgrid'
import { WebhookEvents } from '@/lib/webhooks/trigger'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/email/sendgrid')
jest.mock('@/lib/webhooks/trigger')
jest.mock('fs', () => ({
  createReadStream: jest.fn(() => 'mock-stream'),
}))

describe('Transcription Processor', () => {
  let mockJob: Partial<Job>
  let mockSupabase: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    
    mockSupabase = createMockSupabaseClient()
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockSupabase)
    
    mockJob = {
      data: createMockTranscriptionJob(),
      updateProgress: jest.fn(),
    }
  })
  
  describe('processTranscription', () => {
    it('should successfully process a transcription', async () => {
      // Mock meeting data
      const mockMeeting = createMockMeeting()
      mockTableResponse(mockSupabase, 'meetings', 'single', {
        data: mockMeeting,
        error: null,
      })
      
      // Mock OpenAI response
      const mockOpenAI = require('openai').OpenAI
      const mockTranscription = {
        text: 'This is a test transcription',
        segments: [
          { text: 'Hello', start: 0, end: 1, speaker: 'Speaker 1' },
        ],
        duration: 60,
        language: 'hu',
      }
      
      mockOpenAI.mockImplementation(() => ({
        audio: {
          transcriptions: {
            create: jest.fn().mockResolvedValue(mockTranscription),
          },
        },
      }))
      
      // Execute
      const result = await processTranscription(mockJob as Job)
      
      // Verify progress updates
      expect(mockJob.updateProgress).toHaveBeenCalledWith(10)
      expect(mockJob.updateProgress).toHaveBeenCalledWith(20)
      expect(mockJob.updateProgress).toHaveBeenCalledWith(60)
      expect(mockJob.updateProgress).toHaveBeenCalledWith(80)
      expect(mockJob.updateProgress).toHaveBeenCalledWith(100)
      
      // Verify meeting update
      const updateCall = mockSupabase.from('meetings').update
      expect(updateCall).toHaveBeenCalledWith(
        expect.objectContaining({
          transcript: expect.objectContaining({
            text: mockTranscription.text,
            segments: expect.any(Array),
            language: 'hu',
            duration: 60,
          }),
          status: 'transcribed',
          processing_mode: 'balanced',
          processed_at: expect.any(String),
        })
      )
      
      // Verify webhook trigger
      expect(WebhookEvents.meetingCompleted).toHaveBeenCalledWith(
        expect.objectContaining({
          id: mockJob.data.meetingId,
          organization_id: mockJob.data.organizationId,
        }),
        mockTranscription
      )
      
      // Verify email sent
      expect(emailService.sendMeetingCompletedEmail).toHaveBeenCalled()
      
      // Verify result
      expect(result).toEqual({
        success: true,
        meetingId: mockJob.data.meetingId,
        duration: 60,
        wordCount: 4,
      })
    })
    
    it('should handle transcription failure', async () => {
      // Mock OpenAI error
      const mockOpenAI = require('openai').OpenAI
      mockOpenAI.mockImplementation(() => ({
        audio: {
          transcriptions: {
            create: jest.fn().mockRejectedValue(new Error('API Error')),
          },
        },
      }))
      
      // Execute and expect error
      await expect(processTranscription(mockJob as Job)).rejects.toThrow('API Error')
    })
    
    it('should skip email if user has disabled notifications', async () => {
      // Mock meeting with email preferences disabled
      const mockMeeting = createMockMeeting({
        profiles: {
          email: 'test@example.com',
          settings: {
            emailPreferences: {
              meetingCompleted: false,
            },
          },
        },
      })
      
      mockTableResponse(mockSupabase, 'meetings', 'single', {
        data: mockMeeting,
        error: null,
      })
      
      // Execute
      await processTranscription(mockJob as Job)
      
      // Verify email NOT sent
      expect(emailService.sendMeetingCompletedEmail).not.toHaveBeenCalled()
    })
    
    it('should handle different transcription modes', async () => {
      // Test with precision mode
      mockJob.data.mode = 'precision'
      
      const mockOpenAI = require('openai').OpenAI
      const createMock = jest.fn().mockResolvedValue({
        text: 'Precision transcription',
        duration: 60,
      })
      
      mockOpenAI.mockImplementation(() => ({
        audio: {
          transcriptions: {
            create: createMock,
          },
        },
      }))
      
      await processTranscription(mockJob as Job)
      
      // Verify precision mode settings
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0, // Precision mode uses temperature 0
        })
      )
    })
  })
})