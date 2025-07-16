import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getSubscriptionPlan } from '@/lib/payments/subscription-plans'

export async function GET(request: NextRequest) {
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

    // Get organization details including subscription
    const { data: organization } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', profile.organization_id)
      .single()

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get subscription plan details
    const plan = getSubscriptionPlan(organization.subscription_tier)
    if (!plan) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 })
    }

    // Get current usage for all modes
    const modes = ['fast', 'balanced', 'precision'] as const
    const modeStatus = await Promise.all(
      modes.map(async (mode) => {
        const { data: usage } = await supabase
          .rpc('check_mode_availability', {
            p_organization_id: profile.organization_id,
            p_mode: mode
          })
          .single()

        return {
          mode,
          available: (usage as any)?.available || false,
          used: (usage as any)?.used || 0,
          limit: (usage as any)?.limit_minutes || 0,
          remaining: (usage as any)?.remaining || 0,
          unlimited: (usage as any)?.limit_minutes === -1
        }
      })
    )

    // Get current month's total usage
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
    const { data: monthlyUsage } = await supabase
      .from('mode_usage')
      .select('fast_minutes, balanced_minutes, precision_minutes')
      .eq('organization_id', profile.organization_id)
      .eq('month', currentMonth)
      .single()

    const totalUsed = monthlyUsage
      ? (monthlyUsage.fast_minutes || 0) + 
        (monthlyUsage.balanced_minutes || 0) + 
        (monthlyUsage.precision_minutes || 0)
      : 0

    return NextResponse.json({
      subscription: {
        tier: organization.subscription_tier,
        name: plan.name,
        currency: plan.currency
      },
      modeStatus,
      totalUsed,
      limits: plan.limits,
      resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
    })
  } catch (error) {
    console.error('Mode status error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}