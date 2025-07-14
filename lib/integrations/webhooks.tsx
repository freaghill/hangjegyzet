import { createHmac } from 'crypto'
import { z } from 'zod'
import { captureException } from '@/lib/monitoring/sentry'

// Webhook event types that fit our meeting intelligence platform vision
export const WebhookEvents = {
  // Meeting lifecycle events
  MEETING_CREATED: 'meeting.created',
  MEETING_STARTED: 'meeting.started',
  MEETING_COMPLETED: 'meeting.completed',
  MEETING_FAILED: 'meeting.failed',
  
  // Transcription events
  TRANSCRIPTION_STARTED: 'transcription.started',
  TRANSCRIPTION_COMPLETED: 'transcription.completed',
  TRANSCRIPTION_FAILED: 'transcription.failed',
  
  // AI processing events
  SUMMARY_GENERATED: 'summary.generated',
  ACTION_ITEMS_EXTRACTED: 'action_items.extracted',
  INSIGHTS_GENERATED: 'insights.generated',
  
  // Organization events
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPGRADED: 'organization.upgraded',
  USAGE_LIMIT_REACHED: 'usage_limit.reached',
  
  // User events
  USER_JOINED_ORGANIZATION: 'user.joined_organization',
  USER_LEFT_ORGANIZATION: 'user.left_organization',
} as const

export type WebhookEvent = typeof WebhookEvents[keyof typeof WebhookEvents]

// Webhook payload schemas
const MeetingPayloadSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  duration_seconds: z.number().optional(),
  created_at: z.string(),
  organization_id: z.string().uuid(),
  created_by: z.string().uuid(),
  status: z.string(),
  meeting_url: z.string().optional(),
})

const TranscriptionPayloadSchema = z.object({
  meeting_id: z.string().uuid(),
  duration: z.number(),
  word_count: z.number(),
  language: z.string(),
  mode: z.enum(['fast', 'balanced', 'precision']),
})

const ActionItemsPayloadSchema = z.object({
  meeting_id: z.string().uuid(),
  action_items: z.array(z.object({
    text: z.string(),
    assignee: z.string().optional(),
    due_date: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  })),
})

// Webhook configuration
export interface WebhookConfig {
  id: string
  url: string
  secret: string
  events: WebhookEvent[]
  active: boolean
  organization_id: string
  created_at: string
  last_triggered?: string
  failure_count: number
}

// Webhook delivery result
export interface WebhookDelivery {
  id: string
  webhook_id: string
  event: WebhookEvent
  payload: any
  status: 'pending' | 'success' | 'failed'
  attempts: number
  response_status?: number
  response_body?: string
  delivered_at?: string
  next_retry?: string
}

export class WebhookService {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAYS = [60000, 300000, 900000] // 1min, 5min, 15min
  
  /**
   * Sign webhook payload for security
   */
  static signPayload(payload: string, secret: string): string {
    return createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
  }
  
  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.signPayload(payload, secret)
    return signature === expectedSignature
  }
  
  /**
   * Send webhook to endpoint
   */
  static async sendWebhook(
    webhook: WebhookConfig,
    event: WebhookEvent,
    payload: any
  ): Promise<WebhookDelivery> {
    const deliveryId = crypto.randomUUID()
    const timestamp = Date.now()
    const body = JSON.stringify({
      id: deliveryId,
      event,
      data: payload,
      timestamp,
      organization_id: webhook.organization_id,
    })
    
    const signature = this.signPayload(body, webhook.secret)
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp.toString(),
          'X-Webhook-Id': deliveryId,
          'User-Agent': 'HangJegyzet-Webhook/1.0',
        },
        body,
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })
      
      const responseBody = await response.text()
      
      return {
        id: deliveryId,
        webhook_id: webhook.id,
        event,
        payload,
        status: response.ok ? 'success' : 'failed',
        attempts: 1,
        response_status: response.status,
        response_body: responseBody.slice(0, 1000), // Limit stored response
        delivered_at: new Date().toISOString(),
      }
    } catch (error) {
      captureException(error as Error, {
        metadata: {
          webhook_id: webhook.id,
          event,
          url: webhook.url,
        }
      })
      
      return {
        id: deliveryId,
        webhook_id: webhook.id,
        event,
        payload,
        status: 'failed',
        attempts: 1,
        response_body: error instanceof Error ? error.message : 'Unknown error',
        next_retry: new Date(Date.now() + this.RETRY_DELAYS[0]).toISOString(),
      }
    }
  }
  
  /**
   * Retry failed webhook delivery
   */
  static async retryWebhook(
    webhook: WebhookConfig,
    delivery: WebhookDelivery
  ): Promise<WebhookDelivery> {
    if (delivery.attempts >= this.MAX_RETRIES) {
      return {
        ...delivery,
        status: 'failed',
      }
    }
    
    const result = await this.sendWebhook(webhook, delivery.event, delivery.payload)
    
    return {
      ...result,
      id: delivery.id,
      attempts: delivery.attempts + 1,
      next_retry: result.status === 'failed' && delivery.attempts < this.MAX_RETRIES - 1
        ? new Date(Date.now() + this.RETRY_DELAYS[delivery.attempts + 1]).toISOString()
        : undefined,
    }
  }
  
  /**
   * Format payload for specific events
   */
  static formatPayload(event: WebhookEvent, data: any): any {
    switch (event) {
      case WebhookEvents.MEETING_COMPLETED:
        return {
          meeting: MeetingPayloadSchema.parse(data.meeting),
          transcript_url: data.transcript_url,
          summary: data.summary,
          duration_minutes: Math.round((data.meeting.duration_seconds || 0) / 60),
        }
        
      case WebhookEvents.ACTION_ITEMS_EXTRACTED:
        return ActionItemsPayloadSchema.parse(data)
        
      case WebhookEvents.TRANSCRIPTION_COMPLETED:
        return TranscriptionPayloadSchema.parse(data)
        
      default:
        return data
    }
  }
  
  /**
   * Trigger webhooks for an event
   */
  static async triggerWebhooks(
    organizationId: string,
    event: WebhookEvent,
    data: any,
    webhookConfigs: WebhookConfig[]
  ): Promise<void> {
    // Filter active webhooks that subscribe to this event
    const relevantWebhooks = webhookConfigs.filter(
      w => w.active && 
      w.organization_id === organizationId && 
      w.events.includes(event)
    )
    
    if (relevantWebhooks.length === 0) return
    
    const payload = this.formatPayload(event, data)
    
    // Send webhooks in parallel
    await Promise.all(
      relevantWebhooks.map(webhook => 
        this.sendWebhook(webhook, event, payload)
          .then(delivery => {
            // Store delivery in database
            // This would be handled by the webhook job queue
          })
          .catch(error => {
            captureException(error as Error, {
              organizationId,
              metadata: { event, webhook_id: webhook.id }
            })
          })
      )
    )
  }
}