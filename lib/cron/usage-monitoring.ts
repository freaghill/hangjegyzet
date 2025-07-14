import { AlertingService } from '@/lib/monitoring/alerting-service'
import { createClient } from '@/lib/supabase/server'

/**
 * Cron job configuration for usage monitoring
 * This should be run every 5 minutes for anomaly detection
 * and every hour for usage limit notifications
 */

export async function runUsageMonitoring() {
  console.log('[CRON] Starting usage monitoring job...')
  
  try {
    const supabase = await createClient()
    const alertingService = new AlertingService(supabase)
    
    // Run anomaly detection
    const alerts = await alertingService.runAnomalyDetection()
    console.log(`[CRON] Created ${alerts.length} anomaly alerts`)
    
    // Send usage limit webhooks (every hour)
    const currentMinute = new Date().getMinutes()
    if (currentMinute < 5) { // Run in the first 5 minutes of each hour
      await sendUsageLimitWebhooks()
    }
    
    console.log('[CRON] Usage monitoring job completed')
  } catch (error) {
    console.error('[CRON] Usage monitoring job failed:', error)
  }
}

async function sendUsageLimitWebhooks() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/usage-limits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_WEBHOOK_SECRET}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Webhook endpoint returned ${response.status}`)
    }
    
    const result = await response.json()
    console.log(`[CRON] Sent ${result.notifications} usage limit notifications`)
  } catch (error) {
    console.error('[CRON] Failed to send usage limit webhooks:', error)
  }
}

/**
 * Vercel Cron configuration
 * Add this to vercel.json:
 * 
 * crons array with:
 * - path: /api/cron/usage-monitoring
 * - schedule: every 5 minutes (cron expression)
 */

// API Route handler for Vercel Cron
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  await runUsageMonitoring()
  
  return new Response('OK', { status: 200 })
}