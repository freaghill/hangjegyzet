import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/security/rate-limiter'
import { z } from 'zod'

const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  active: z.boolean().optional(),
  description: z.string().optional(),
})

// GET /api/webhooks/[id] - Get webhook details
async function getWebhook(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get webhook with recent deliveries
  const { data: webhook, error } = await supabase
    .from('webhook_configs')
    .select(`
      *,
      webhook_deliveries (
        id,
        event,
        status,
        attempts,
        response_status,
        delivered_at,
        created_at
      )
    `)
    .eq('id', params.id)
    .single()
  
  if (error || !webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }
  
  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  
  if (webhook.organization_id !== profile?.organization_id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  
  // Don't return secret
  const { secret, ...webhookData } = webhook
  
  return NextResponse.json({ webhook: webhookData })
}

// PATCH /api/webhooks/[id] - Update webhook
async function updateWebhook(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const updates = UpdateWebhookSchema.parse(body)
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get existing webhook
    const { data: existing } = await supabase
      .from('webhook_configs')
      .select('organization_id')
      .eq('id', params.id)
      .single()
    
    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }
    
    // Verify ownership
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (existing.organization_id !== profile?.organization_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Update webhook
    const { data: webhook, error } = await supabase
      .from('webhook_configs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Don't return secret
    const { secret, ...webhookData } = webhook
    
    return NextResponse.json({ webhook: webhookData })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// DELETE /api/webhooks/[id] - Delete webhook
async function deleteWebhook(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Get existing webhook
  const { data: existing } = await supabase
    .from('webhook_configs')
    .select('organization_id')
    .eq('id', params.id)
    .single()
  
  if (!existing) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }
  
  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()
  
  if (existing.organization_id !== profile?.organization_id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  
  // Delete webhook
  const { error } = await supabase
    .from('webhook_configs')
    .delete()
    .eq('id', params.id)
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json({ success: true })
}

export const GET = withRateLimit(getWebhook, 'api')
export const PATCH = withRateLimit(updateWebhook, 'api')
export const DELETE = withRateLimit(deleteWebhook, 'api')