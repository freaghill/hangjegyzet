import { Worker, Job } from 'bullmq'
import { createClient } from '@/lib/supabase/server'
import { WebhookService } from '@/lib/integrations/webhooks'
import { QUEUE_NAMES, WORKER_SETTINGS } from '../config'
import { captureException } from '@/lib/monitoring/sentry'

export interface WebhookJobData {
  webhookId: string
  deliveryId?: string
  event: string
  payload: any
  isRetry?: boolean
}

async function processWebhook(job: Job<WebhookJobData>) {
  const { webhookId, deliveryId, event, payload, isRetry } = job.data
  
  try {
    await job.updateProgress(10)
    
    // Get webhook configuration
    const supabase = await createClient()
    const { data: webhook, error: webhookError } = await supabase
      .from('webhook_configs')
      .select('*')
      .eq('id', webhookId)
      .single()
    
    if (webhookError || !webhook) {
      throw new Error('Webhook not found')
    }
    
    // Skip if webhook is inactive
    if (!webhook.active) {
      return { skipped: true, reason: 'Webhook inactive' }
    }
    
    await job.updateProgress(30)
    
    // Send or retry webhook
    let delivery
    if (isRetry && deliveryId) {
      // Get existing delivery
      const { data: existingDelivery } = await supabase
        .from('webhook_deliveries')
        .select('*')
        .eq('id', deliveryId)
        .single()
      
      if (existingDelivery) {
        delivery = await WebhookService.retryWebhook(webhook, existingDelivery)
      } else {
        delivery = await WebhookService.sendWebhook(webhook, event, payload)
      }
    } else {
      delivery = await WebhookService.sendWebhook(webhook, event, payload)
    }
    
    await job.updateProgress(70)
    
    // Store delivery result
    if (isRetry && deliveryId) {
      await supabase
        .from('webhook_deliveries')
        .update({
          status: delivery.status,
          attempts: delivery.attempts,
          response_status: delivery.response_status,
          response_body: delivery.response_body,
          delivered_at: delivery.delivered_at,
          next_retry: delivery.next_retry,
        })
        .eq('id', deliveryId)
    } else {
      await supabase
        .from('webhook_deliveries')
        .insert({
          id: delivery.id,
          webhook_id: webhookId,
          event,
          payload,
          status: delivery.status,
          attempts: delivery.attempts,
          response_status: delivery.response_status,
          response_body: delivery.response_body,
          delivered_at: delivery.delivered_at,
          next_retry: delivery.next_retry,
        })
    }
    
    // Update webhook stats
    if (delivery.status === 'success') {
      await supabase
        .from('webhook_configs')
        .update({
          last_triggered: new Date().toISOString(),
          failure_count: 0,
        })
        .eq('id', webhookId)
    } else {
      await supabase
        .from('webhook_configs')
        .update({
          failure_count: webhook.failure_count + 1,
        })
        .eq('id', webhookId)
      
      // Schedule retry if needed
      if (delivery.next_retry && delivery.attempts < 3) {
        const retryDelay = new Date(delivery.next_retry).getTime() - Date.now()
        await job.queue.add(
          'webhook-retry',
          {
            webhookId,
            deliveryId: delivery.id,
            event,
            payload,
            isRetry: true,
          },
          {
            delay: retryDelay,
            attempts: 1,
          }
        )
      }
    }
    
    await job.updateProgress(100)
    
    return {
      success: delivery.status === 'success',
      attempts: delivery.attempts,
      responseStatus: delivery.response_status,
    }
    
  } catch (error) {
    captureException(error as Error, {
      metadata: {
        webhookId,
        event,
        isRetry,
      }
    })
    
    throw error
  }
}

// Create worker
export const webhookWorker = new Worker(
  QUEUE_NAMES.WEBHOOK || 'webhook',
  processWebhook,
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    },
    concurrency: 10,
    limiter: {
      max: 50,
      duration: 60000, // 50 webhooks per minute
    },
  }
)

// Worker event handlers
webhookWorker.on('completed', (job) => {
  console.log(`Webhook delivered: ${job.data.event} to ${job.data.webhookId}`)
})

webhookWorker.on('failed', (job, err) => {
  console.error(`Webhook failed: ${job?.data.event}`, err)
})