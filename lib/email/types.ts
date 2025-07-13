export interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlContent: string
  textContent: string
  variables: EmailVariable[]
  category: 'transactional' | 'notification' | 'marketing'
  language: string
}

export interface EmailVariable {
  name: string
  description: string
  required: boolean
  defaultValue?: string
}

export type EmailTemplateType = 
  | 'welcome'
  | 'transcription-complete'
  | 'payment-receipt'
  | 'team-invitation'
  | 'password-reset'
  | 'email-verification'

export interface EmailData {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  template: EmailTemplateType
  variables: Record<string, any>
  attachments?: EmailAttachment[]
  metadata?: Record<string, any>
  scheduledAt?: Date
}

export interface EmailAttachment {
  filename: string
  content: Buffer | string
  type?: string
  disposition?: 'attachment' | 'inline'
  contentId?: string
}

export interface EmailDeliveryStatus {
  id: string
  messageId: string
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'complained' | 'unsubscribed'
  error?: string
  timestamp: Date
  events: EmailEvent[]
}

export interface EmailEvent {
  type: 'processed' | 'dropped' | 'delivered' | 'bounce' | 'open' | 'click' | 'spam_report' | 'unsubscribe'
  timestamp: Date
  data?: Record<string, any>
}

export interface EmailConfig {
  sendgridApiKey: string
  fromEmail: string
  fromName: string
  replyToEmail?: string
  sandboxMode?: boolean
  ipPoolName?: string
  categories?: string[]
}

export interface EmailQueueItem {
  id: string
  email: EmailData
  attempts: number
  nextRetryAt?: Date
  error?: string
  createdAt: Date
  processedAt?: Date
}