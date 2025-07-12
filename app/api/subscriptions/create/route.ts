import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionManager } from '@/lib/payments/subscription'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
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

    // Parse request body
    const { plan, billingData } = await request.json()
    
    if (!plan || !billingData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create subscription with user email
    const subscriptionManager = new SubscriptionManager()
    const result = await subscriptionManager.createSubscription(
      profile.organization_id,
      plan,
      {
        ...billingData,
        email: user.email
      }
    )

    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
      transactionId: result.transactionId,
      orderRef: result.orderRef,
    })
  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}