import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'
import { EmailData, EmailQueueItem } from './types'
import { SendGridService } from './sendgrid-service'

export class EmailQueueService {
  private supabase
  private sendGridService: SendGridService
  private isProcessing = false
  private processInterval: NodeJS.Timeout | null = null

  constructor() {
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    this.sendGridService = new SendGridService()
  }

  async enqueue(emailData: EmailData, options?: {
    priority?: number
    scheduledAt?: Date
    maxAttempts?: number
  }): Promise<string> {
    // Check suppression list
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to]
    const validRecipients = await this.filterSuppressedEmails(recipients, emailData.template)
    
    if (validRecipients.length === 0) {
      console.log('All recipients are suppressed')
      return ''
    }

    const { data, error } = await this.supabase
      .from('email_queue')
      .insert({
        template: emailData.template,
        to_emails: validRecipients,
        cc_emails: emailData.cc ? (Array.isArray(emailData.cc) ? emailData.cc : [emailData.cc]) : null,
        bcc_emails: emailData.bcc ? (Array.isArray(emailData.bcc) ? emailData.bcc : [emailData.bcc]) : null,
        variables: emailData.variables,
        metadata: emailData.metadata,
        priority: options?.priority || 5,
        max_attempts: options?.maxAttempts || 3,
        scheduled_at: options?.scheduledAt?.toISOString(),
        status: 'pending'
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to enqueue email: ${error.message}`)
    }

    return data.id
  }

  async enqueueBulk(emails: EmailData[], options?: {
    priority?: number
    scheduledAt?: Date
    maxAttempts?: number
  }): Promise<string[]> {
    const ids: string[] = []
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 100
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize)
      const batchIds = await Promise.all(
        batch.map(email => this.enqueue(email, options))
      )
      ids.push(...batchIds.filter(id => id !== ''))
    }

    return ids
  }

  startProcessing(intervalMs: number = 10000) {
    if (this.processInterval) {
      return
    }

    // Process immediately
    this.processQueue()

    // Then process at intervals
    this.processInterval = setInterval(() => {
      if (!this.isProcessing) {
        this.processQueue()
      }
    }, intervalMs)
  }

  stopProcessing() {
    if (this.processInterval) {
      clearInterval(this.processInterval)
      this.processInterval = null
    }
  }

  private async processQueue() {
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    try {
      // Get pending emails
      const { data: queueItems, error } = await this.supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .or(`scheduled_at.is.null,scheduled_at.lte.${new Date().toISOString()}`)
        .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(50)

      if (error || !queueItems) {
        console.error('Error fetching queue items:', error)
        return
      }

      // Process each email
      for (const item of queueItems) {
        await this.processQueueItem(item as any)
      }
    } catch (error) {
      console.error('Error processing queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  private async processQueueItem(item: any) {
    try {
      // Update status to processing
      await this.supabase
        .from('email_queue')
        .update({ 
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)

      // Prepare email data
      const emailData: EmailData = {
        to: item.to_emails,
        cc: item.cc_emails,
        bcc: item.bcc_emails,
        template: item.template,
        variables: item.variables,
        metadata: {
          ...item.metadata,
          queueId: item.id
        }
      }

      // Send email
      const result = await this.sendGridService.send(emailData)

      if (result.status === 'sent' || result.status === 'delivered') {
        // Mark as sent
        await this.supabase
          .from('email_queue')
          .update({ 
            status: 'sent',
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id)
      } else {
        // Handle failure
        await this.handleQueueItemFailure(item, result.error || 'Unknown error')
      }
    } catch (error: any) {
      await this.handleQueueItemFailure(item, error.message)
    }
  }

  private async handleQueueItemFailure(item: any, error: string) {
    const attempts = item.attempts + 1
    
    if (attempts >= item.max_attempts) {
      // Max attempts reached, mark as failed
      await this.supabase
        .from('email_queue')
        .update({ 
          status: 'failed',
          error: error,
          attempts: attempts,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
    } else {
      // Schedule retry with exponential backoff
      const retryDelay = Math.min(Math.pow(2, attempts) * 60000, 3600000) // Max 1 hour
      const nextRetryAt = new Date(Date.now() + retryDelay)

      await this.supabase
        .from('email_queue')
        .update({ 
          status: 'pending',
          error: error,
          attempts: attempts,
          next_retry_at: nextRetryAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id)
    }
  }

  private async filterSuppressedEmails(
    emails: string[], 
    template: string
  ): Promise<string[]> {
    const { data: suppressions } = await this.supabase
      .from('email_suppressions')
      .select('email')
      .in('email', emails)
      .or(`template.is.null,template.eq.${template}`)

    const suppressedEmails = new Set(suppressions?.map(s => s.email) || [])
    return emails.filter(email => !suppressedEmails.has(email))
  }

  async getQueueStatus(): Promise<{
    pending: number
    processing: number
    sent: number
    failed: number
    scheduled: number
  }> {
    const { data } = await this.supabase
      .from('email_queue')
      .select('status, count')
      .group('status')

    const status = {
      pending: 0,
      processing: 0,
      sent: 0,
      failed: 0,
      scheduled: 0
    }

    data?.forEach(row => {
      if (row.status in status) {
        status[row.status as keyof typeof status] = parseInt(row.count as any)
      }
    })

    // Count scheduled emails separately
    const { count: scheduledCount } = await this.supabase
      .from('email_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .gt('scheduled_at', new Date().toISOString())

    status.scheduled = scheduledCount || 0
    status.pending -= status.scheduled

    return status
  }

  async retryFailed(queueId: string): Promise<void> {
    await this.supabase
      .from('email_queue')
      .update({
        status: 'pending',
        attempts: 0,
        error: null,
        next_retry_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId)
      .eq('status', 'failed')
  }

  async cancel(queueId: string): Promise<void> {
    await this.supabase
      .from('email_queue')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', queueId)
      .in('status', ['pending', 'scheduled'])
  }

  async getQueueItem(queueId: string): Promise<EmailQueueItem | null> {
    const { data } = await this.supabase
      .from('email_queue')
      .select('*')
      .eq('id', queueId)
      .single()

    if (!data) return null

    return {
      id: data.id,
      email: {
        to: data.to_emails,
        cc: data.cc_emails || undefined,
        bcc: data.bcc_emails || undefined,
        template: data.template as any,
        variables: data.variables,
        metadata: data.metadata
      },
      attempts: data.attempts,
      nextRetryAt: data.next_retry_at ? new Date(data.next_retry_at) : undefined,
      error: data.error || undefined,
      createdAt: new Date(data.created_at),
      processedAt: data.processed_at ? new Date(data.processed_at) : undefined
    }
  }
}