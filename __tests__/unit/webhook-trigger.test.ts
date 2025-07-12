import { WebhookTrigger, WebhookEvents } from '@/lib/webhooks/trigger'
import { createMockSupabaseClient, mockTableResponse } from '@/test/utils/supabase-mock'
import { createMockWebhook, createMockMeeting } from '@/test/utils/factories'

// Mock dependencies
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

describe('Webhook System', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabase = createMockSupabaseClient()
    require('@/lib/supabase/server').createClient.mockResolvedValue(mockSupabase)
    
    // Reset fetch mock
    ;(global.fetch as jest.Mock).mockReset()
  })
  
  describe('WebhookTrigger', () => {
    it('should trigger webhooks for matching events', async () => {
      // Mock webhook data
      const mockWebhooks = [
        createMockWebhook({
          id: 'webhook-1',
          events: ['meeting.completed'],
          webhook_url: 'https://example.com/webhook1',
        }),
        createMockWebhook({
          id: 'webhook-2',
          events: ['meeting.completed', 'meeting.created'],
          webhook_url: 'https://example.com/webhook2',
        }),
      ]
      
      mockTableResponse(mockSupabase, 'webhooks', 'execute', {
        data: mockWebhooks,
        error: null,
      })
      
      // Mock successful webhook delivery
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('OK'),
      })
      
      // Trigger webhook
      await WebhookTrigger.trigger(
        'meeting.completed',
        { id: 'meet-123', title: 'Test Meeting' },
        'org-123'
      )
      
      // Verify webhooks were called
      expect(global.fetch).toHaveBeenCalledTimes(2)
      
      // Verify webhook payloads
      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/webhook1',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Event': 'meeting.completed',
            'X-Webhook-Timestamp': expect.any(String),
            'X-Webhook-ID': expect.any(String),
          }),
          body: expect.stringContaining('meeting.completed'),
        })
      )
      
      // Verify webhook logs were created
      expect(mockSupabase.from('webhook_logs').insert).toHaveBeenCalledTimes(2)
    })
    
    it('should handle webhook delivery failure', async () => {
      const mockWebhook = createMockWebhook()
      
      mockTableResponse(mockSupabase, 'webhooks', 'execute', {
        data: [mockWebhook],
        error: null,
      })
      
      // Mock failed webhook delivery
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))
      
      // Trigger webhook (should not throw)
      await expect(
        WebhookTrigger.trigger('meeting.completed', {}, 'org-123')
      ).resolves.not.toThrow()
      
      // Verify failure was logged
      expect(mockSupabase.from('webhook_logs').insert).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_id: mockWebhook.id,
          success: false,
          status_code: 0,
          error_message: 'Network error',
        })
      )
    })
    
    it('should add signature when webhook has secret', async () => {
      const mockWebhook = createMockWebhook({
        secret: 'webhook-secret',
      })
      
      mockTableResponse(mockSupabase, 'webhooks', 'execute', {
        data: [mockWebhook],
        error: null,
      })
      
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
      })
      
      await WebhookTrigger.trigger('meeting.completed', {}, 'org-123')
      
      // Verify signature header was included
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Webhook-Signature': expect.stringMatching(/^sha256=[a-f0-9]+$/),
          }),
        })
      )
    })
    
    it('should verify webhook signatures correctly', () => {
      const payload = JSON.stringify({ test: 'data' })
      const secret = 'test-secret'
      
      // Generate valid signature
      const crypto = require('crypto')
      const hmac = crypto.createHmac('sha256', secret)
      hmac.update(payload)
      const validSignature = `sha256=${hmac.digest('hex')}`
      
      // Test valid signature
      expect(
        WebhookTrigger.verifySignature(payload, validSignature, secret)
      ).toBe(true)
      
      // Test invalid signature
      expect(
        WebhookTrigger.verifySignature(payload, 'sha256=invalid', secret)
      ).toBe(false)
    })
  })
  
  describe('WebhookEvents', () => {
    beforeEach(() => {
      jest.spyOn(WebhookTrigger, 'trigger').mockResolvedValue()
    })
    
    it('should trigger meeting.created event', async () => {
      const meeting = createMockMeeting()
      
      await WebhookEvents.meetingCreated(meeting)
      
      expect(WebhookTrigger.trigger).toHaveBeenCalledWith(
        'meeting.created',
        expect.objectContaining({
          id: meeting.id,
          title: meeting.title,
          organizationId: meeting.organization_id,
        }),
        meeting.organization_id
      )
    })
    
    it('should trigger meeting.completed event with transcription data', async () => {
      const meeting = createMockMeeting()
      const transcription = {
        text: 'Test transcript',
        duration: 3600,
        speakers: ['Speaker 1', 'Speaker 2'],
        summary: 'Test summary',
      }
      
      await WebhookEvents.meetingCompleted(meeting, transcription)
      
      expect(WebhookTrigger.trigger).toHaveBeenCalledWith(
        'meeting.completed',
        expect.objectContaining({
          id: meeting.id,
          duration: transcription.duration,
          wordCount: 2,
          speakerCount: 2,
          transcriptUrl: expect.stringContaining(`/meetings/${meeting.id}`),
          summary: transcription.summary,
        }),
        meeting.organization_id
      )
    })
    
    it('should trigger action_items.created event', async () => {
      const meeting = createMockMeeting()
      const actionItems = [
        { text: 'Task 1', assignee: 'John' },
        { text: 'Task 2', assignee: 'Jane' },
      ]
      
      await WebhookEvents.actionItemsCreated(meeting, actionItems)
      
      expect(WebhookTrigger.trigger).toHaveBeenCalledWith(
        'action_items.created',
        expect.objectContaining({
          meetingId: meeting.id,
          actionItems,
        }),
        meeting.organization_id
      )
    })
  })
})