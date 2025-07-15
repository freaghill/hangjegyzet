import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { subscriptionManager } from '@/lib/payments/subscription-manager'

export async function GET(
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
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*, organizations!inner(*)')
      .eq('id', params.id)
      .single()
    
    if (error || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }
    
    // Check user belongs to organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (profile?.organization_id !== subscription.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    return NextResponse.json({
      id: subscription.id,
      organizationId: subscription.organization_id,
      planId: subscription.plan_id,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      trialEnd: subscription.trial_end,
      metadata: subscription.metadata,
    })
  } catch (error: any) {
    console.error('Get subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get subscription' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
      .select('organization_id')
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
    
    if (profile?.organization_id !== subscription.organization_id || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const body = await request.json()
    const updated = await subscriptionManager.updateSubscription(params.id, body)
    
    return NextResponse.json(updated)
  } catch (error: any) {
    console.error('Update subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update subscription' },
      { status: 500 }
    )
  }
}