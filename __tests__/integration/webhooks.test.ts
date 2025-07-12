import { WebhookService } from '@/lib/integrations/webhooks'
import { createClient } from '@/lib/supabase/admin'
import { Queue } from 'bullmq'
import fetch from 'node-fetch'

jest.mock('@/lib/supabase/admin')
jest.mock('bullmq')
jest.mock('node-fetch')

describe('Webhook Integration', () => {
  let webhookService: WebhookService
  const mockSupabase = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
  }

  const mockWebhook = {
    id: 'test-webhook-id',
    url: 'https://example.com/webhook',
    secret: 'test-secret',
    events: ['meeting.completed', 'transcription.ready'],
    is_active: true,
    organization_id: 'test-org-id',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    ;(Queue as jest.Mock).mockImplementation(() => ({
      add: jest.fn(),
      process: jest.fn(),
    }))
    webhookService = new WebhookService()
  })

  describe('sendWebhook', () => {
    it('should send webhook with proper signature', async () => {
      const event = 'meeting.completed'
      const data = { meetingId: 'test-meeting', title: 'Test Meeting' }

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      })

      await webhookService.sendWebhook(mockWebhook as any, event, data)

      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Webhook-Event': 'meeting.completed',
            'X-Webhook-Signature': expect.any(String),
            'X-Webhook-Timestamp': expect.any(String),
          }),
          body: expect.stringContaining('meeting.completed'),
          timeout: 30000,
        })
      )

      // Verify signature format
      const call = (fetch as jest.Mock).mock.calls[0]
      const signature = call[1].headers['X-Webhook-Signature']
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/)
    })

    it('should handle webhook delivery failure', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const result = await webhookService.sendWebhook(
        mockWebhook as any,
        'meeting.completed',
        { meetingId: 'test' }
      )

      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(500)
      expect(result.error).toBe('Internal Server Error')
    })

    it('should handle network errors', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await webhookService.sendWebhook(
        mockWebhook as any,
        'meeting.completed',
        { meetingId: 'test' }
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should respect retry configuration', async () => {
      const webhookWithRetry = {
        ...mockWebhook,
        retry_config: {
          max_attempts: 3,
          backoff_seconds: [10, 30, 60],
        },
      }

      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      })

      const result = await webhookService.sendWebhook(
        webhookWithRetry as any,
        'meeting.completed',
        { meetingId: 'test' }
      )

      expect(result.success).toBe(false)
      expect(result.shouldRetry).toBe(true)
      expect(result.nextRetryDelay).toBe(10)
    })
  })

  describe('triggerWebhooks', () => {
    it('should trigger all active webhooks for an event', async () => {
      const activeWebhooks = [
        { ...mockWebhook, id: 'webhook-1' },
        { ...mockWebhook, id: 'webhook-2', url: 'https://example.org/webhook' },
      ]

      mockSupabase.select.mockResolvedValue({ data: activeWebhooks, error: null })

      const queueAddSpy = jest.fn()
      ;(Queue as jest.Mock).mockImplementation(() => ({
        add: queueAddSpy,
        process: jest.fn(),
      }))

      webhookService = new WebhookService()

      await webhookService.triggerWebhooks(
        'test-org-id',
        'meeting.completed',
        { meetingId: 'test-meeting' }
      )

      expect(queueAddSpy).toHaveBeenCalledTimes(2)
      expect(queueAddSpy).toHaveBeenCalledWith(
        'send-webhook',
        expect.objectContaining({
          webhookId: 'webhook-1',
          event: 'meeting.completed',
          data: { meetingId: 'test-meeting' },
        }),
        expect.any(Object)
      )
    })

    it('should filter webhooks by event type', async () => {
      const webhooks = [
        { ...mockWebhook, id: 'webhook-1', events: ['meeting.completed'] },
        { ...mockWebhook, id: 'webhook-2', events: ['transcription.ready'] },
        { ...mockWebhook, id: 'webhook-3', events: ['meeting.completed', 'transcription.ready'] },
      ]

      mockSupabase.select.mockResolvedValue({ data: webhooks, error: null })

      const queueAddSpy = jest.fn()
      ;(Queue as jest.Mock).mockImplementation(() => ({
        add: queueAddSpy,
        process: jest.fn(),
      }))

      webhookService = new WebhookService()

      await webhookService.triggerWebhooks(
        'test-org-id',
        'meeting.completed',
        { meetingId: 'test' }
      )

      expect(queueAddSpy).toHaveBeenCalledTimes(2) // webhook-1 and webhook-3
    })
  })

  describe('signature verification', () => {
    it('should correctly sign payloads', () => {
      const payload = JSON.stringify({
        event: 'meeting.completed',
        data: { meetingId: 'test' },
        timestamp: '2024-01-15T10:00:00Z',
      })

      const signature = WebhookService.signPayload(payload, 'test-secret')
      
      expect(signature).toMatch(/^[a-f0-9]{64}$/)
      expect(signature).toHaveLength(64)
    })

    it('should verify valid signatures', () => {
      const payload = JSON.stringify({ test: 'data' })
      const secret = 'webhook-secret'
      const signature = WebhookService.signPayload(payload, secret)

      const isValid = WebhookService.verifySignature(payload, signature, secret)
      expect(isValid).toBe(true)
    })

    it('should reject invalid signatures', () => {
      const payload = JSON.stringify({ test: 'data' })
      const secret = 'webhook-secret'
      const wrongSignature = WebhookService.signPayload(payload, 'wrong-secret')

      const isValid = WebhookService.verifySignature(payload, wrongSignature, secret)
      expect(isValid).toBe(false)
    })
  })

  describe('webhook event logging', () => {
    it('should log successful webhook deliveries', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
      })

      mockSupabase.insert.mockReturnThis()
      mockSupabase.select.mockResolvedValue({ data: null, error: null })

      await webhookService.sendWebhook(mockWebhook as any, 'meeting.completed', { id: 'test' })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_id: 'test-webhook-id',
          event: 'meeting.completed',
          status: 'success',
          status_code: 200,
        })
      )
    })

    it('should log failed webhook deliveries', async () => {
      ;(fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      mockSupabase.insert.mockReturnThis()
      mockSupabase.select.mockResolvedValue({ data: null, error: null })

      await webhookService.sendWebhook(mockWebhook as any, 'meeting.completed', { id: 'test' })

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_id: 'test-webhook-id',
          event: 'meeting.completed',
          status: 'failed',
          status_code: 404,
          error: 'Not Found',
        })
      )
    })
  })
})