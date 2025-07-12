import { createClient } from '@/lib/supabase/server'

export type TranscriptionMode = 'fast' | 'balanced' | 'precision'

/**
 * Atomically check and increment usage if allowed
 * Returns true if usage was recorded, false if limit exceeded
 */
export async function incrementUsageIfAllowed(
  organizationId: string,
  mode: TranscriptionMode,
  amount: number = 1
): Promise<{ allowed: boolean; error?: string }> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase.rpc('increment_usage_if_allowed', {
      p_org_id: organizationId,
      p_mode: mode,
      p_amount: amount
    })
    
    if (error) {
      console.error('Usage increment error:', error)
      return { allowed: false, error: error.message }
    }
    
    return { allowed: data === true }
  } catch (error) {
    console.error('Unexpected usage error:', error)
    return { 
      allowed: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get current usage for an organization
 */
export async function getCurrentUsage(
  organizationId: string
): Promise<Record<TranscriptionMode, number>> {
  const supabase = await createClient()
  
  try {
    const { data, error } = await supabase.rpc('get_current_usage', {
      p_org_id: organizationId
    })
    
    if (error) {
      console.error('Get usage error:', error)
      return { fast: 0, balanced: 0, precision: 0 }
    }
    
    return {
      fast: data?.fast || 0,
      balanced: data?.balanced || 0,
      precision: data?.precision || 0
    }
  } catch (error) {
    console.error('Unexpected usage error:', error)
    return { fast: 0, balanced: 0, precision: 0 }
  }
}

/**
 * Get remaining usage for an organization
 */
export async function getRemainingUsage(
  organizationId: string
): Promise<Record<TranscriptionMode, number>> {
  const supabase = await createClient()
  
  try {
    // Get organization's mode allocation
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('mode_allocation')
      .eq('id', organizationId)
      .single()
    
    if (orgError || !org) {
      console.error('Get organization error:', orgError)
      return { fast: 0, balanced: 0, precision: 0 }
    }
    
    const allocation = org.mode_allocation as Record<string, number>
    const currentUsage = await getCurrentUsage(organizationId)
    
    return {
      fast: allocation.fast === -1 ? -1 : Math.max(0, allocation.fast - currentUsage.fast),
      balanced: allocation.balanced === -1 ? -1 : Math.max(0, allocation.balanced - currentUsage.balanced),
      precision: allocation.precision === -1 ? -1 : Math.max(0, allocation.precision - currentUsage.precision)
    }
  } catch (error) {
    console.error('Unexpected usage error:', error)
    return { fast: 0, balanced: 0, precision: 0 }
  }
}

/**
 * Check if a specific amount of usage is available
 */
export async function canUseAmount(
  organizationId: string,
  mode: TranscriptionMode,
  amount: number
): Promise<boolean> {
  const remaining = await getRemainingUsage(organizationId)
  
  // -1 means unlimited
  if (remaining[mode] === -1) return true
  
  return remaining[mode] >= amount
}