import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization and check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only owners can cancel subscriptions
    if (profile.role !== 'owner') {
      return NextResponse.json({ error: 'Only organization owners can cancel subscriptions' }, { status: 403 })
    }
    
    // Get current subscription
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('subscription_tier, subscription_ends_at')
      .eq('id', profile.organization_id)
      .single()
    
    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Can't cancel if already on trial
    if (org.subscription_tier === 'trial') {
      return NextResponse.json({ error: 'Cannot cancel trial subscription' }, { status: 400 })
    }
    
    // Set subscription to expire at the end of the current period
    // (We don't immediately downgrade to allow users to use their paid period)
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_cancelled_at: new Date().toISOString(),
        // Keep the current tier until subscription_ends_at
      })
      .eq('id', profile.organization_id)
    
    if (updateError) {
      throw updateError
    }
    
    // Create a cancellation record
    const { error: recordError } = await supabase
      .from('subscription_history')
      .insert({
        organization_id: profile.organization_id,
        action: 'cancelled',
        from_tier: org.subscription_tier,
        to_tier: 'trial',
        user_id: user.id,
        metadata: {
          reason: request.headers.get('X-Cancellation-Reason') || 'Not specified',
          scheduled_downgrade_date: org.subscription_ends_at
        }
      })
    
    if (recordError) {
      console.error('Failed to record cancellation:', recordError)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Subscription cancelled successfully',
      downgradeDate: org.subscription_ends_at,
      currentTier: org.subscription_tier
    })
  } catch (error) {
    console.error('Subscription cancellation error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to cancel subscription' 
    }, { status: 500 })
  }
}