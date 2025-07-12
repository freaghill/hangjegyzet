import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripePayment } from '@/lib/payments/stripe'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Get organization's Stripe customer ID
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', profile.organization_id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    if (!organization.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this organization' },
        { status: 404 }
      )
    }

    // Create Stripe billing portal session
    const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`
    const result = await stripePayment.createPortalSession(
      organization.stripe_customer_id,
      returnUrl
    )

    if (!result.success || !result.url) {
      return NextResponse.json(
        { error: result.error || 'Failed to create portal session' },
        { status: 500 }
      )
    }

    return NextResponse.json({ url: result.url })
  } catch (error) {
    console.error('Billing portal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}