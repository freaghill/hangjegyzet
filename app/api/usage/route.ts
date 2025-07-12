import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Get organization subscription details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('subscription_tier, subscription_ends_at')
      .eq('id', profile.organization_id)
      .single()
    
    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    
    // Get current month usage
    const currentMonth = new Date()
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString()
    
    const { data: usage, error: usageError } = await supabase
      .from('usage_stats')
      .select('minutes_used, meetings_count')
      .eq('organization_id', profile.organization_id)
      .eq('month', monthStart.slice(0, 10))
      .single()
    
    // Define subscription limits
    const subscriptionLimits = {
      trial: { minutes: 500, users: 3, storage: 5 * 1024 * 1024 * 1024 }, // 5GB
      starter: { minutes: 500, users: 3, storage: 10 * 1024 * 1024 * 1024 }, // 10GB  
      professional: { minutes: 2000, users: 10, storage: 50 * 1024 * 1024 * 1024 }, // 50GB
      enterprise: { minutes: -1, users: -1, storage: -1 } // Unlimited
    }
    
    const tier = org.subscription_tier || 'trial'
    const limits = subscriptionLimits[tier as keyof typeof subscriptionLimits]
    const minutesUsed = usage?.minutes_used || 0
    
    // Calculate storage used (sum of all meeting file sizes)
    const { data: storageData } = await supabase
      .from('meetings')
      .select('file_size')
      .eq('organization_id', profile.organization_id)
    
    const storageBytes = storageData?.reduce((sum, meeting) => sum + (meeting.file_size || 0), 0) || 0
    
    const usageData = {
      organizationId: profile.organization_id,
      transcriptionMinutes: minutesUsed,
      apiCalls: 0, // TODO: Implement API call tracking
      storageBytes,
      transcriptionLimit: limits.minutes,
      apiLimit: 1000, // Fixed for now
      storageLimit: limits.storage,
      isWithinLimits: (limits.minutes === -1 || minutesUsed < limits.minutes) &&
                      (limits.storage === -1 || storageBytes < limits.storage)
    }
    
    return NextResponse.json(usageData)
  } catch (error) {
    console.error('Error fetching usage:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}