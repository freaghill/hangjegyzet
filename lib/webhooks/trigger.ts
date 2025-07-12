import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export interface WebhookPayload {
  event: string
  data: any
  timestamp: string
  organizationId: string
}

export class WebhookTrigger {
  /**
   * Trigger webhooks for a specific event
   */
  static async trigger(event: string, data: any, organizationId: string) {
    try {
      const supabase = await createClient()
      
      // Get all active webhooks for this organization and event
      const { data: webhooks, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .contains('events', [event])
      
      if (error) {
        console.error('Error fetching webhooks:', error)
        return
      }
      
      if (!webhooks || webhooks.length === 0) {
        return
      }
      
      // Prepare payload
      const payload: WebhookPayload = {
        event,
        data,
        timestamp: new Date().toISOString(),
        organizationId,
      }
      
      // Send webhooks in parallel
      const promises = webhooks.map(webhook => 
        this.sendWebhook(webhook, payload)
      )
      
      await Promise.allSettled(promises)
    } catch (error) {
      console.error('Webhook trigger error:', error)
    }
  }
  
  /**
   * Send a single webhook
   */
  private static async sendWebhook(webhook: any, payload: WebhookPayload) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': payload.event,
        'X-Webhook-Timestamp': payload.timestamp,
        'X-Webhook-ID': crypto.randomUUID(),
      }
      
      // Add signature if webhook has a secret
      if (webhook.secret) {
        const signature = this.generateSignature(payload, webhook.secret)
        headers['X-Webhook-Signature'] = signature
      }
      
      // Send the webhook
      const response = await fetch(webhook.webhook_url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })
      
      // Log the result
      const supabase = await createClient()
      await supabase.from('webhook_logs').insert({
        webhook_id: webhook.id,
        event: payload.event,
        status_code: response.status,
        success: response.ok,
        request_body: payload,
        response_body: response.ok ? null : await response.text().catch(() => null),
        sent_at: new Date().toISOString(),
      })
      
      // Update webhook last_triggered_at
      await supabase
        .from('webhooks')
        .update({ last_triggered_at: new Date().toISOString() })
        .eq('id', webhook.id)
        
    } catch (error) {
      console.error(`Failed to send webhook to ${webhook.webhook_url}:`, error)
      
      // Log the failure
      const supabase = await createClient()
      await supabase.from('webhook_logs').insert({
        webhook_id: webhook.id,
        event: payload.event,
        status_code: 0,
        success: false,
        error_message: error instanceof Error ? error.message : 'Unknown error',
        sent_at: new Date().toISOString(),
      })
    }
  }
  
  /**
   * Generate HMAC signature for webhook payload
   */
  private static generateSignature(payload: WebhookPayload, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(JSON.stringify(payload))
    return `sha256=${hmac.digest('hex')}`
  }
  
  /**
   * Verify webhook signature (for incoming webhooks)
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const expectedSignature = `sha256=${hmac.digest('hex')}`
    
    // Use timing-safe comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  }
}

// Helper functions for common webhook triggers
export const WebhookEvents = {
  async meetingCreated(meeting: any) {
    await WebhookTrigger.trigger('meeting.created', {
      id: meeting.id,
      title: meeting.title,
      organizationId: meeting.organization_id,
      createdBy: meeting.created_by,
      createdAt: meeting.created_at,
      source: meeting.source,
      status: meeting.status,
    }, meeting.organization_id)
  },
  
  async meetingCompleted(meeting: any, transcription: any) {
    await WebhookTrigger.trigger('meeting.completed', {
      id: meeting.id,
      title: meeting.title,
      organizationId: meeting.organization_id,
      duration: transcription.duration,
      wordCount: transcription.text?.split(' ').length || 0,
      speakerCount: transcription.speakers?.length || 0,
      transcriptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/meetings/${meeting.id}`,
      summary: transcription.summary,
      completedAt: new Date().toISOString(),
    }, meeting.organization_id)
  },
  
  async meetingFailed(meeting: any, error: string) {
    await WebhookTrigger.trigger('meeting.failed', {
      id: meeting.id,
      title: meeting.title,
      organizationId: meeting.organization_id,
      error,
      failedAt: new Date().toISOString(),
    }, meeting.organization_id)
  },
  
  async actionItemsCreated(meeting: any, actionItems: any[]) {
    await WebhookTrigger.trigger('action_items.created', {
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      organizationId: meeting.organization_id,
      actionItems,
      createdAt: new Date().toISOString(),
    }, meeting.organization_id)
  },
  
  async summaryGenerated(meeting: any, summary: any) {
    await WebhookTrigger.trigger('summary.generated', {
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      organizationId: meeting.organization_id,
      summary,
      generatedAt: new Date().toISOString(),
    }, meeting.organization_id)
  },
  
  async userMentioned(meeting: any, mentionedUser: any, context: string) {
    await WebhookTrigger.trigger('user.mentioned', {
      meetingId: meeting.id,
      meetingTitle: meeting.title,
      organizationId: meeting.organization_id,
      mentionedUserId: mentionedUser.id,
      mentionedUserEmail: mentionedUser.email,
      context,
      timestamp: new Date().toISOString(),
    }, meeting.organization_id)
  },
}