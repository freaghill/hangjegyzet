import { createClient } from '@/lib/supabase/server'
import { trackMetric } from '@/lib/monitoring'

export interface UsageData {
  organizationId: string
  transcriptionMinutes: number
  apiCalls: number
  storageBytes: number
  transcriptionLimit: number
  apiLimit: number
  storageLimit: number
  isWithinLimits: boolean
}

export class UsageTracker {
  /**
   * Get current month usage for an organization
   */
  async getCurrentUsage(organizationId: string): Promise<UsageData> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('current_usage')
      .select('*')
      .eq('organization_id', organizationId)
      .single()
    
    if (error) {
      console.error('Error fetching usage:', error)
      throw new Error('Failed to fetch usage data')
    }
    
    const usage: UsageData = {
      organizationId,
      transcriptionMinutes: data.transcription_minutes || 0,
      apiCalls: data.api_calls || 0,
      storageBytes: data.storage_bytes || 0,
      transcriptionLimit: data.transcription_minutes_limit || 0,
      apiLimit: data.api_calls_limit || 0,
      storageLimit: data.storage_bytes_limit || 0,
      isWithinLimits: !data.transcription_limit_reached && 
                      !data.api_limit_reached && 
                      !data.storage_limit_reached
    }
    
    // Track metrics
    trackMetric('usage.transcription_minutes', usage.transcriptionMinutes, {
      organization: organizationId
    })
    
    return usage
  }
  
  /**
   * Check if organization can perform action
   */
  async checkLimit(
    organizationId: string, 
    type: 'transcription' | 'api' | 'storage',
    amount: number = 1
  ): Promise<boolean> {
    const usage = await this.getCurrentUsage(organizationId)
    
    switch (type) {
      case 'transcription':
        return usage.transcriptionLimit === -1 || 
               (usage.transcriptionMinutes + amount) <= usage.transcriptionLimit
      
      case 'api':
        return usage.apiLimit === -1 || 
               (usage.apiCalls + amount) <= usage.apiLimit
      
      case 'storage':
        return usage.storageLimit === -1 || 
               (usage.storageBytes + amount) <= usage.storageLimit
      
      default:
        return false
    }
  }
  
  /**
   * Track API usage
   */
  async trackAPICall(
    organizationId: string,
    userId: string,
    endpoint: string,
    method: string
  ): Promise<void> {
    const supabase = await createClient()
    
    // Call the database function
    await supabase.rpc('track_api_usage', {
      p_organization_id: organizationId,
      p_user_id: userId,
      p_endpoint: endpoint,
      p_method: method
    })
    
    trackMetric('api.usage', 1, {
      organization: organizationId,
      endpoint,
      method
    })
  }
  
  /**
   * Get usage history for billing
   */
  async getUsageHistory(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    month: string
    transcriptionMinutes: number
    apiCalls: number
    storageGB: number
  }>> {
    const supabase = await createClient()
    
    const { data, error } = await supabase.rpc('get_billing_usage', {
      p_organization_id: organizationId,
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0]
    })
    
    if (error) {
      console.error('Error fetching usage history:', error)
      throw new Error('Failed to fetch usage history')
    }
    
    return data.map(row => ({
      month: row.month,
      transcriptionMinutes: row.transcription_minutes,
      apiCalls: row.api_calls,
      storageGB: row.storage_bytes / (1024 * 1024 * 1024)
    }))
  }
  
  /**
   * Get usage percentage
   */
  getUsagePercentage(current: number, limit: number): number {
    if (limit === -1) return 0 // Unlimited
    if (limit === 0) return 100 // No limit set
    return Math.round((current / limit) * 100)
  }
  
  /**
   * Format usage for display
   */
  formatUsage(usage: UsageData) {
    return {
      transcription: {
        used: usage.transcriptionMinutes,
        limit: usage.transcriptionLimit === -1 ? 'Korlátlan' : usage.transcriptionLimit,
        percentage: this.getUsagePercentage(usage.transcriptionMinutes, usage.transcriptionLimit),
        remaining: usage.transcriptionLimit === -1 ? 'Korlátlan' : 
                   Math.max(0, usage.transcriptionLimit - usage.transcriptionMinutes)
      },
      api: {
        used: usage.apiCalls,
        limit: usage.apiLimit === -1 ? 'Korlátlan' : usage.apiLimit,
        percentage: this.getUsagePercentage(usage.apiCalls, usage.apiLimit),
        remaining: usage.apiLimit === -1 ? 'Korlátlan' : 
                   Math.max(0, usage.apiLimit - usage.apiCalls)
      },
      storage: {
        usedGB: (usage.storageBytes / (1024 * 1024 * 1024)).toFixed(2),
        limitGB: usage.storageLimit === -1 ? 'Korlátlan' : 
                 (usage.storageLimit / (1024 * 1024 * 1024)).toFixed(0),
        percentage: this.getUsagePercentage(usage.storageBytes, usage.storageLimit),
        remainingGB: usage.storageLimit === -1 ? 'Korlátlan' : 
                     ((usage.storageLimit - usage.storageBytes) / (1024 * 1024 * 1024)).toFixed(2)
      }
    }
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker()