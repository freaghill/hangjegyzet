import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSubscriptionPlan } from '@/lib/payments/subscription-plans'

export const runtime = 'edge'

interface WebhookPayload {
  event: 'usage.limit_warning' | 'usage.limit_reached' | 'usage.limit_exceeded'
  organization: {
    id: string
    name: string
    subscription_tier: string
  }
  usage: {
    mode: 'fast' | 'balanced' | 'precision'
    current: number
    limit: number
    percentage: number
  }
  timestamp: string
  recommendations?: string[]
}

/**
 * Internal webhook endpoint that checks usage and sends notifications
 * This should be called by a cron job every hour
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal auth token
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.INTERNAL_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    
    // Get all organizations with their current usage
    const { data: organizations } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        subscription_tier,
        webhook_url,
        alert_settings
      `)
      .not('webhook_url', 'is', null)

    if (!organizations) {
      return NextResponse.json({ processed: 0 })
    }

    const notifications: WebhookPayload[] = []

    // Check each organization
    for (const org of organizations) {
      // Skip if webhooks are disabled
      if (!org.alert_settings?.webhook_enabled) continue

      const plan = getSubscriptionPlan(org.subscription_tier)
      if (!plan) continue

      // Get current month usage
      const { data: usage } = await supabase
        .rpc('get_current_month_usage', { p_organization_id: org.id })
        .single()

      if (!usage) continue

      // Check each mode
      const modes = ['fast', 'balanced', 'precision'] as const
      for (const mode of modes) {
        const current = usage[`${mode}_minutes`] || 0
        const limit = plan.limits.modeAllocation[mode]
        
        // Skip unlimited modes
        if (limit === -1 || limit === 0) continue
        
        const percentage = (current / limit) * 100
        
        // Determine event type based on usage
        let event: WebhookPayload['event'] | null = null
        let recommendations: string[] = []
        
        if (percentage >= 100) {
          event = 'usage.limit_exceeded'
          recommendations = [
            `A ${mode} mód elérte a havi limitet`,
            'Frissítsen magasabb csomagra a folytatáshoz',
            'Vagy használjon másik módot a következő meetingekhez'
          ]
        } else if (percentage >= 90) {
          event = 'usage.limit_warning'
          recommendations = [
            `Csak ${limit - current} perc maradt a ${mode} módból`,
            'Fontolja meg a takarékosabb használatot',
            'Vagy készüljön fel a csomag frissítésére'
          ]
        } else if (percentage >= 80) {
          // Check if we already sent a warning for 80%
          const warningKey = `${org.id}:${mode}:80:${new Date().getMonth()}`
          const { data: existingWarning } = await supabase
            .from('webhook_notifications')
            .select('id')
            .eq('notification_key', warningKey)
            .single()
          
          if (!existingWarning) {
            event = 'usage.limit_warning'
            recommendations = [
              `${mode} mód használat 80%-on`,
              'Kövesse figyelemmel a használatot'
            ]
            
            // Record that we sent this warning
            await supabase
              .from('webhook_notifications')
              .insert({
                organization_id: org.id,
                notification_key: warningKey,
                sent_at: new Date().toISOString()
              })
          }
        }
        
        // Create webhook payload if needed
        if (event) {
          const payload: WebhookPayload = {
            event,
            organization: {
              id: org.id,
              name: org.name,
              subscription_tier: org.subscription_tier
            },
            usage: {
              mode,
              current,
              limit,
              percentage: Math.round(percentage)
            },
            timestamp: new Date().toISOString(),
            recommendations
          }
          
          notifications.push(payload)
          
          // Send webhook
          await sendWebhook(org.webhook_url, payload)
        }
      }
    }

    return NextResponse.json({
      processed: organizations.length,
      notifications: notifications.length
    })

  } catch (error) {
    console.error('Usage limit webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Send webhook notification to organization
 */
async function sendWebhook(url: string, payload: WebhookPayload) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-HangJegyzet-Event': payload.event,
        'X-HangJegyzet-Signature': generateSignature(payload)
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      console.error(`Webhook delivery failed: ${response.status} to ${url}`)
    }
  } catch (error) {
    console.error('Webhook delivery error:', error)
  }
}

/**
 * Generate HMAC signature for webhook payload
 */
function generateSignature(payload: WebhookPayload): string {
  // In production, use crypto.subtle.sign with HMAC
  // For now, return a placeholder
  return 'signature-placeholder'
}

/**
 * Webhook configuration endpoint for organizations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get webhook configuration
    const { data: org } = await supabase
      .from('organizations')
      .select('webhook_url, alert_settings')
      .eq('id', profile.organization_id)
      .single()

    return NextResponse.json({
      webhook_url: org?.webhook_url || null,
      enabled: org?.alert_settings?.webhook_enabled || false,
      events: [
        {
          name: 'usage.limit_warning',
          description: 'Sent when usage reaches 80% or 90% of monthly limit'
        },
        {
          name: 'usage.limit_reached',
          description: 'Sent when usage reaches 100% of monthly limit'
        },
        {
          name: 'usage.limit_exceeded',
          description: 'Sent when attempting to use a mode that has reached its limit'
        }
      ],
      payload_example: {
        event: 'usage.limit_warning',
        organization: {
          id: 'org_123',
          name: 'Example Corp',
          subscription_tier: 'profi'
        },
        usage: {
          mode: 'balanced',
          current: 450,
          limit: 500,
          percentage: 90
        },
        timestamp: new Date().toISOString(),
        recommendations: [
          'Csak 50 perc maradt a balanced módból',
          'Fontolja meg a takarékosabb használatot'
        ]
      }
    })
  } catch (error) {
    console.error('Webhook config error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Update webhook configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { webhook_url, enabled } = await request.json()
    
    // Validate webhook URL
    if (webhook_url && !isValidUrl(webhook_url)) {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Update webhook configuration
    const { error } = await supabase
      .from('organizations')
      .update({
        webhook_url,
        alert_settings: {
          webhook_enabled: enabled
        }
      })
      .eq('id', profile.organization_id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update webhook configuration' },
        { status: 500 }
      )
    }

    // Test webhook if provided
    if (webhook_url && enabled) {
      await sendWebhook(webhook_url, {
        event: 'usage.limit_warning',
        organization: {
          id: profile.organization_id,
          name: 'Test Organization',
          subscription_tier: 'test'
        },
        usage: {
          mode: 'balanced',
          current: 90,
          limit: 100,
          percentage: 90
        },
        timestamp: new Date().toISOString(),
        recommendations: ['This is a test webhook notification']
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}