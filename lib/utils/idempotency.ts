import { createClient } from '@/lib/supabase/server'

/**
 * Ensures webhook events are processed only once
 * Prevents duplicate payments, subscriptions, etc.
 */
export async function ensureIdempotent(
  eventId: string,
  eventType: string,
  handler: () => Promise<void>
): Promise<{ processed: boolean; error?: Error }> {
  const supabase = await createClient()
  
  try {
    // Check if event already processed
    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle()
    
    if (existing) {
      console.log(`Event ${eventId} already processed`)
      return { processed: true }
    }
    
    // Start transaction
    const { error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        event_id: eventId,
        event_type: eventType,
        status: 'processing',
        created_at: new Date().toISOString()
      })
    
    if (insertError) {
      // Another process beat us to it
      if (insertError.code === '23505') { // Unique violation
        return { processed: true }
      }
      throw insertError
    }
    
    // Process the event
    try {
      await handler()
      
      // Mark as completed
      await supabase
        .from('webhook_events')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
      
      return { processed: true }
    } catch (error) {
      // Mark as failed
      await supabase
        .from('webhook_events')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          failed_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
      
      throw error
    }
  } catch (error) {
    console.error(`Idempotency check failed for ${eventId}:`, error)
    return {
      processed: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    }
  }
}

/**
 * Clean up old webhook events (run as cron job)
 */
export async function cleanupWebhookEvents(daysToKeep = 30): Promise<void> {
  const supabase = await createClient()
  
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
  
  const { error } = await supabase
    .from('webhook_events')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
  
  if (error) {
    console.error('Failed to cleanup webhook events:', error)
    throw error
  }
}