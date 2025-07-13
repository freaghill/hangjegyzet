import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { subscriptionManager } from '@/lib/payments/subscription-manager'
import { auditLogger } from '@/lib/security/audit-logger'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('organization_id, plan_id, status')
      .eq('id', params.id)
      .single()
    
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }
    
    // Check user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (profile?.organization_id !== subscription.organization_id || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    // Check if already canceled
    if (subscription.status === 'canceled') {
      return NextResponse.json({ error: 'Subscription already canceled' }, { status: 400 })
    }
    
    // Cancel subscription
    const body = await request.json()
    const immediately = body.immediately || false
    
    const canceled = await subscriptionManager.cancelSubscription(params.id, immediately)
    
    // Log cancellation
    await auditLogger.log({
      user_id: user.id,
      organization_id: subscription.organization_id,
      action: 'subscription.canceled',
      resource_type: 'subscription',
      resource_id: params.id,
      metadata: {
        planId: subscription.plan_id,
        immediately,
      },
    })
    
    return NextResponse.json({
      success: true,
      subscription: canceled,
      message: immediately 
        ? 'Az előfizetés azonnal megszűnt'
        : 'Az előfizetés az aktuális időszak végén megszűnik'
    })
  } catch (error: any) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}