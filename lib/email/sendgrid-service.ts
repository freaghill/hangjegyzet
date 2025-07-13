import sgMail from '@sendgrid/mail'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { 
  EmailData, 
  EmailDeliveryStatus, 
  EmailConfig,
  EmailTemplateType,
  EmailEvent
} from './types'
import { EmailTemplateService } from './template-service'

export class SendGridService {
  private supabase
  private templateService: EmailTemplateService
  private config: EmailConfig

  constructor(config?: Partial<EmailConfig>) {
    this.config = {
      sendgridApiKey: process.env.SENDGRID_API_KEY!,
      fromEmail: process.env.SENDGRID_FROM_EMAIL || 'hello@hangjegyzet.hu',
      fromName: process.env.SENDGRID_FROM_NAME || 'Hangjegyzet',
      replyToEmail: process.env.SENDGRID_REPLY_TO_EMAIL,
      sandboxMode: process.env.NODE_ENV === 'development',
      ...config
    }

    // Initialize SendGrid
    sgMail.setApiKey(this.config.sendgridApiKey)

    // Initialize Supabase
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Initialize template service
    this.templateService = new EmailTemplateService()
  }

  async send(emailData: EmailData): Promise<EmailDeliveryStatus> {
    try {
      // Get template
      const template = await this.templateService.getTemplate(
        emailData.template,
        'hu' // Default to Hungarian
      )

      // Process template with variables
      const processedTemplate = await this.templateService.processTemplate(
        template,
        emailData.variables
      )

      // Prepare SendGrid message
      const msg = {
        to: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName
        },
        replyTo: emailData.replyTo || this.config.replyToEmail,
        subject: processedTemplate.subject,
        text: processedTemplate.textContent,
        html: processedTemplate.htmlContent,
        cc: emailData.cc,
        bcc: emailData.bcc,
        attachments: emailData.attachments?.map(att => ({
          content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
          filename: att.filename,
          type: att.type,
          disposition: att.disposition,
          contentId: att.contentId
        })),
        customArgs: {
          template: emailData.template,
          ...emailData.metadata
        },
        categories: [emailData.template, ...(this.config.categories || [])],
        mailSettings: {
          sandboxMode: {
            enable: this.config.sandboxMode || false
          }
        },
        trackingSettings: {
          clickTracking: {
            enable: true,
            enableText: true
          },
          openTracking: {
            enable: true
          },
          subscriptionTracking: {
            enable: true
          }
        }
      }

      // Send email
      const [response] = await sgMail.send(msg)
      
      // Create delivery status record
      const deliveryStatus: EmailDeliveryStatus = {
        id: response.headers['x-message-id'] || crypto.randomUUID(),
        messageId: response.headers['x-message-id'] || '',
        status: 'sent',
        timestamp: new Date(),
        events: [{
          type: 'processed',
          timestamp: new Date()
        }]
      }

      // Store email record
      await this.storeEmailRecord({
        message_id: deliveryStatus.messageId,
        template: emailData.template,
        to_email: Array.isArray(emailData.to) ? emailData.to[0] : emailData.to,
        subject: processedTemplate.subject,
        status: 'sent',
        variables: emailData.variables,
        metadata: emailData.metadata,
        sent_at: new Date().toISOString()
      })

      return deliveryStatus
    } catch (error: any) {
      console.error('SendGrid error:', error)

      // Store failed email record
      await this.storeEmailRecord({
        template: emailData.template,
        to_email: Array.isArray(emailData.to) ? emailData.to[0] : emailData.to,
        subject: 'Failed to send',
        status: 'failed',
        error: error.message,
        variables: emailData.variables,
        metadata: emailData.metadata,
        sent_at: new Date().toISOString()
      })

      return {
        id: crypto.randomUUID(),
        messageId: '',
        status: 'failed',
        error: error.message,
        timestamp: new Date(),
        events: [{
          type: 'dropped',
          timestamp: new Date(),
          data: { reason: error.message }
        }]
      }
    }
  }

  async sendBulk(emails: EmailData[]): Promise<EmailDeliveryStatus[]> {
    // Process emails in batches to avoid rate limits
    const batchSize = 100
    const results: EmailDeliveryStatus[] = []

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(email => this.send(email))
      )
      results.push(...batchResults)
      
      // Small delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    return results
  }

  async processWebhook(body: any, signature: string): Promise<void> {
    // Verify webhook signature
    const isValid = this.verifyWebhookSignature(body, signature)
    if (!isValid) {
      throw new Error('Invalid webhook signature')
    }

    // Process events
    for (const event of body) {
      await this.processWebhookEvent(event)
    }
  }

  private async processWebhookEvent(event: any): Promise<void> {
    const emailEvent: EmailEvent = {
      type: event.event as any,
      timestamp: new Date(event.timestamp * 1000),
      data: event
    }

    // Update email record with event
    await this.supabase
      .from('email_logs')
      .update({
        status: this.mapEventToStatus(event.event),
        last_event: event.event,
        last_event_at: emailEvent.timestamp.toISOString(),
        events: this.supabase.sql`array_append(events, ${JSON.stringify(emailEvent)}::jsonb)`
      })
      .eq('message_id', event.sg_message_id)

    // Track analytics
    await this.trackEmailAnalytics(event)
  }

  private mapEventToStatus(eventType: string): string {
    switch (eventType) {
      case 'delivered':
        return 'delivered'
      case 'bounce':
      case 'blocked':
        return 'bounced'
      case 'spam_report':
        return 'complained'
      case 'unsubscribe':
        return 'unsubscribed'
      default:
        return 'sent'
    }
  }

  private verifyWebhookSignature(body: any, signature: string): boolean {
    // Implementation depends on SendGrid webhook verification key
    // This is a placeholder - implement actual verification
    return true
  }

  private async storeEmailRecord(record: any): Promise<void> {
    await this.supabase.from('email_logs').insert(record)
  }

  private async trackEmailAnalytics(event: any): Promise<void> {
    await this.supabase.from('email_analytics').insert({
      event_type: event.event,
      message_id: event.sg_message_id,
      email: event.email,
      timestamp: new Date(event.timestamp * 1000).toISOString(),
      data: event
    })
  }

  async getDeliveryStatus(messageId: string): Promise<EmailDeliveryStatus | null> {
    const { data } = await this.supabase
      .from('email_logs')
      .select('*')
      .eq('message_id', messageId)
      .single()

    if (!data) return null

    return {
      id: data.id,
      messageId: data.message_id,
      status: data.status as any,
      error: data.error,
      timestamp: new Date(data.sent_at),
      events: data.events || []
    }
  }

  async getEmailStats(days: number = 30): Promise<any> {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data } = await this.supabase
      .from('email_analytics')
      .select('event_type, count')
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })

    // Aggregate stats
    const stats = {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      bounced: 0,
      complained: 0,
      unsubscribed: 0
    }

    data?.forEach(row => {
      switch (row.event_type) {
        case 'processed':
          stats.sent++
          break
        case 'delivered':
          stats.delivered++
          break
        case 'open':
          stats.opened++
          break
        case 'click':
          stats.clicked++
          break
        case 'bounce':
          stats.bounced++
          break
        case 'spam_report':
          stats.complained++
          break
        case 'unsubscribe':
          stats.unsubscribed++
          break
      }
    })

    return stats
  }
}