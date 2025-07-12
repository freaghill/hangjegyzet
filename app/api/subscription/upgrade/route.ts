import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionManager, SubscriptionPlan } from '@/lib/payments/subscription'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { plan, billingData } = body
    
    // Validate plan
    const validPlans = ['starter', 'professional', 'enterprise']
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Check if user has permission (only owners and admins)
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    // Get current subscription
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('subscription_tier, billing_data')
      .eq('id', profile.organization_id)
      .single()
    
    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Check if it's actually an upgrade
    const tierOrder = { trial: 0, starter: 1, professional: 2, enterprise: 3 }
    const currentTier = org.subscription_tier || 'trial'
    
    if (tierOrder[plan as keyof typeof tierOrder] <= tierOrder[currentTier as keyof typeof tierOrder]) {
      return NextResponse.json({ error: 'Not an upgrade' }, { status: 400 })
    }
    
    // Merge billing data with existing
    const finalBillingData = {
      ...org.billing_data,
      ...billingData,
      email: billingData.email || user.email
    }
    
    // Create subscription with payment
    const subscriptionManager = new SubscriptionManager()
    const result = await subscriptionManager.createSubscription(
      profile.organization_id,
      plan as SubscriptionPlan,
      finalBillingData
    )
    
    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
      transactionId: result.transactionId,
      orderRef: result.orderRef
    })
  } catch (error) {
    console.error('Subscription upgrade error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to upgrade subscription' 
    }, { status: 500 })
  }
}