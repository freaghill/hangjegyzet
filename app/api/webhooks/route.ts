import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WebhookService, WebhookEvents } from '@/lib/integrations/webhooks'
import { withRateLimit } from '@/lib/security/rate-limiter'
import { z } from 'zod'

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  description: z.string().optional(),
})

// GET /api/webhooks - List webhooks
async function listWebhooks(request: NextRequest) {
  const supabase = await createClient()
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
  
  if (!profile?.organization_id) {
    return NextResponse.json({ error: 'No organization' }, { status: 404 })
  }
  
  // Get webhooks
  const { data: webhooks, error } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('created_at', { ascending: false })
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ webhooks })
}

// POST /api/webhooks - Create webhook
async function createWebhook(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, events, description } = CreateWebhookSchema.parse(body)
    
    // Validate events
    const validEvents = Object.values(WebhookEvents)
    const invalidEvents = events.filter(e => !validEvents.includes(e as any))
    if (invalidEvents.length > 0) {
      return NextResponse.json(
        { error: `Invalid events: ${invalidEvents.join(', ')}` },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, organizations!inner(plan)')
      .eq('id', user.id)
      .single()
    
    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization' }, { status: 404 })
    }
    
    // Check webhook limit based on plan
    const { count } = await supabase
      .from('webhook_configs')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', profile.organization_id)
    
    const limits = {
      'hobby': 1,
      'freelancer': 3,
      'professional': 5,
      'team': 10,
      'enterprise': 50,
    }
    
    const plan = profile.organizations?.plan || 'hobby'
    const limit = limits[plan as keyof typeof limits] || 1
    
    if ((count || 0) >= limit) {
      return NextResponse.json(
        { error: `Webhook limit reached (${limit} for ${plan} plan)` },
        { status: 403 }
      )
    }
    
    // Generate secret
    const secret = crypto.randomBytes(32).toString('hex')
    
    // Create webhook
    const { data: webhook, error } = await supabase
      .from('webhook_configs')
      .insert({
        organization_id: profile.organization_id,
        url,
        secret,
        events,
        description,
        active: true,
        failure_count: 0,
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Return webhook with secret (only shown once)
    return NextResponse.json({ 
      webhook: {
        ...webhook,
        secret, // Only returned on creation
      }
    })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export const GET = withRateLimit(listWebhooks, 'api')
export const POST = withRateLimit(createWebhook, 'api')