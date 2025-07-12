import { createClient } from '@/lib/supabase/server'
import { SlackNotificationService, SlackMessage } from './slack'
import { TeamsNotificationService, TeamsMessage } from './teams'

export type NotificationEventType = 
  | 'meeting_completed'
  | 'meeting_failed'
  | 'action_items_created'
  | 'user_mentioned'
  | 'highlight_created'
  | 'transcription_ready'
  | 'summary_ready'

export interface NotificationPayload {
  eventType: NotificationEventType
  organizationId: string
  meetingId?: string
  data: {
    duration_seconds?: number
    summary?: string
    mentionedUser?: string
    [key: string]: unknown
  }
}

export interface WebhookConfig {
  id: string
  name: string
  type: 'slack' | 'teams' | 'email'
  webhook_url: string
  channel?: string
  is_active: boolean
  settings: Record<string, string | number | boolean | null>
}

export interface NotificationPreference {
  webhook_id: string
  event_type: NotificationEventType
  enabled: boolean
  filters: {
    min_duration?: number
    keywords?: string[]
    users?: string[]
  }
}

export class NotificationManager {
  private appUrl: string

  constructor() {
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  /**
   * Send notification for an event
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    const supabase = await createClient()

    try {
      // Get active webhooks for the organization
      const { data: webhooks, error: webhooksError } = await supabase
        .from('notification_webhooks')
        .select('*')
        .eq('organization_id', payload.organizationId)
        .eq('is_active', true)

      if (webhooksError || !webhooks?.length) {
        console.log('No active webhooks found for organization:', payload.organizationId)
        return
      }

      // Get notification preferences
      const { data: preferences, error: prefsError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('organization_id', payload.organizationId)
        .eq('event_type', payload.eventType)
        .eq('enabled', true)

      if (prefsError) {
        console.error('Error fetching notification preferences:', prefsError)
        return
      }

      // Filter webhooks based on preferences
      const enabledWebhooks = webhooks.filter(webhook => {
        const pref = preferences?.find(p => p.webhook_id === webhook.id)
        return !preferences?.length || pref // If no preferences, allow all webhooks
      })

      // Send to each enabled webhook
      await Promise.all(enabledWebhooks.map(async (webhook) => {
        const pref = preferences?.find(p => p.webhook_id === webhook.id)
        
        // Apply filters if any
        if (pref?.filters && !this.passesFilters(payload, pref.filters)) {
          return
        }

        await this.sendToWebhook(webhook, payload)
      }))
    } catch (error) {
      console.error('Error in notification manager:', error)
    }
  }

  /**
   * Check if notification passes the configured filters
   */
  private passesFilters(payload: NotificationPayload, filters: {
    min_duration?: number
    keywords?: string[]
    users?: string[]
  }): boolean {
    // Check minimum duration filter
    if (filters.min_duration && payload.data.duration_seconds) {
      if (payload.data.duration_seconds < filters.min_duration) {
        return false
      }
    }

    // Check keyword filters
    if (filters.keywords?.length && payload.data.summary) {
      const summary = payload.data.summary.toLowerCase()
      const hasKeyword = filters.keywords.some((keyword: string) => 
        summary.includes(keyword.toLowerCase())
      )
      if (!hasKeyword) {
        return false
      }
    }

    // Check user filters for mentions
    if (filters.users?.length && payload.eventType === 'user_mentioned') {
      if (!filters.users.includes(payload.data.mentionedUser)) {
        return false
      }
    }

    return true
  }

  /**
   * Send notification to a specific webhook
   */
  private async sendToWebhook(webhook: WebhookConfig, payload: NotificationPayload): Promise<void> {
    const supabase = await createClient()
    
    // Log the notification attempt
    const { data: logEntry } = await supabase
      .rpc('log_notification', {
        p_organization_id: payload.organizationId,
        p_webhook_id: webhook.id,
        p_meeting_id: payload.meetingId || null,
        p_event_type: payload.eventType,
        p_payload: payload.data
      })

    try {
      let result: { success: boolean; error?: string }

      if (webhook.type === 'slack') {
        const message = this.formatSlackMessage(payload)
        if (webhook.channel && message) {
          message.channel = webhook.channel
        }
        result = await SlackNotificationService.send(webhook.webhook_url, message!)
      } else if (webhook.type === 'teams') {
        const message = this.formatTeamsMessage(payload)
        result = await TeamsNotificationService.send(webhook.webhook_url, message!)
      } else {
        throw new Error(`Unsupported webhook type: ${webhook.type}`)
      }

      // Update log entry
      if (logEntry?.data) {
        await supabase.rpc('update_notification_status', {
          p_log_id: logEntry.data,
          p_status: result.success ? 'sent' : 'failed',
          p_response: result.success ? { status: 'ok' } : null,
          p_error: result.error || null
        })
      }
    } catch (error) {
      console.error(`Error sending to ${webhook.type} webhook:`, error)
      
      // Update log entry with error
      if (logEntry?.data) {
        await supabase.rpc('update_notification_status', {
          p_log_id: logEntry.data,
          p_status: 'failed',
          p_error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
  }

  /**
   * Format message for Slack
   */
  private formatSlackMessage(payload: NotificationPayload): SlackMessage | null {
    const data = { ...payload.data, appUrl: this.appUrl }

    switch (payload.eventType) {
      case 'meeting_completed':
        return SlackNotificationService.formatMeetingCompleted(data)
      
      case 'meeting_failed':
        return SlackNotificationService.formatMeetingFailed(data)
      
      case 'action_items_created':
        return SlackNotificationService.formatActionItems(data)
      
      case 'user_mentioned':
        return SlackNotificationService.formatMention(data)
      
      default:
        console.warn(`Unhandled Slack notification type: ${payload.eventType}`)
        return null
    }
  }

  /**
   * Format message for Teams
   */
  private formatTeamsMessage(payload: NotificationPayload): TeamsMessage | null {
    const data = { ...payload.data, appUrl: this.appUrl }

    switch (payload.eventType) {
      case 'meeting_completed':
        return TeamsNotificationService.formatMeetingCompleted(data)
      
      case 'meeting_failed':
        return TeamsNotificationService.formatMeetingFailed(data)
      
      case 'action_items_created':
        return TeamsNotificationService.formatActionItems(data)
      
      case 'user_mentioned':
        return TeamsNotificationService.formatMention(data)
      
      case 'highlight_created':
        return TeamsNotificationService.formatHighlightCreated(data)
      
      default:
        console.warn(`Unhandled Teams notification type: ${payload.eventType}`)
        return null
    }
  }

  /**
   * Test a webhook configuration
   */
  static async testWebhook(type: 'slack' | 'teams', webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    if (type === 'slack') {
      return await SlackNotificationService.testWebhook(webhookUrl)
    } else if (type === 'teams') {
      return await TeamsNotificationService.testWebhook(webhookUrl)
    } else {
      return { success: false, error: 'Invalid webhook type' }
    }
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager()