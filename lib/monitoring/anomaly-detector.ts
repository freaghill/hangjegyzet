import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface UsageAnomaly {
  organizationId: string
  type: 'spike' | 'unusual_pattern' | 'rapid_depletion' | 'mode_abuse' | 'concurrent_excess'
  severity: 'low' | 'medium' | 'high' | 'critical'
  mode: 'fast' | 'balanced' | 'precision'
  details: {
    currentValue: number
    expectedValue: number
    deviation: number
    timeWindow: string
    description: string
  }
  detectedAt: Date
}

export interface UsagePattern {
  organizationId: string
  mode: 'fast' | 'balanced' | 'precision'
  hourlyUsage: number[]
  dailyUsage: number[]
  weeklyAverage: number
  monthlyTotal: number
}

export class AnomalyDetector {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  /**
   * Detect anomalies in organization's usage patterns
   */
  async detectAnomalies(organizationId: string): Promise<UsageAnomaly[]> {
    const anomalies: UsageAnomaly[] = []
    
    // Get historical usage data
    const usageHistory = await this.getUsageHistory(organizationId)
    const currentUsage = await this.getCurrentUsage(organizationId)
    const concurrentSessions = await this.getConcurrentSessions(organizationId)
    
    // Check for various anomaly types
    anomalies.push(
      ...await this.detectUsageSpikes(organizationId, usageHistory, currentUsage),
      ...await this.detectRapidDepletion(organizationId, currentUsage),
      ...await this.detectModeAbuse(organizationId, currentUsage),
      ...await this.detectConcurrentExcess(organizationId, concurrentSessions)
    )
    
    return anomalies.filter(a => a !== null)
  }

  /**
   * Detect sudden spikes in usage compared to historical patterns
   */
  private async detectUsageSpikes(
    organizationId: string,
    history: UsagePattern,
    current: any
  ): Promise<UsageAnomaly[]> {
    const anomalies: UsageAnomaly[] = []
    const modes = ['fast', 'balanced', 'precision'] as const
    
    for (const mode of modes) {
      const lastHourUsage = current[`${mode}_last_hour`] || 0
      const avgHourlyUsage = history.weeklyAverage / (7 * 24) // Weekly average per hour
      
      // Detect if usage is 5x higher than average
      if (lastHourUsage > avgHourlyUsage * 5 && lastHourUsage > 10) {
        anomalies.push({
          organizationId,
          type: 'spike',
          severity: lastHourUsage > avgHourlyUsage * 10 ? 'high' : 'medium',
          mode,
          details: {
            currentValue: lastHourUsage,
            expectedValue: Math.round(avgHourlyUsage),
            deviation: Math.round((lastHourUsage / avgHourlyUsage - 1) * 100),
            timeWindow: '1 hour',
            description: `${mode} mode usage spike detected: ${lastHourUsage} minutes in last hour (${Math.round(lastHourUsage / avgHourlyUsage)}x normal)`
          },
          detectedAt: new Date()
        })
      }
    }
    
    return anomalies
  }

  /**
   * Detect rapid depletion of monthly allowance
   */
  private async detectRapidDepletion(
    organizationId: string,
    current: any
  ): Promise<UsageAnomaly[]> {
    const anomalies: UsageAnomaly[] = []
    
    // Get subscription limits
    const { data: org } = await this.supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single()
    
    if (!org) return anomalies
    
    // Calculate days into month
    const now = new Date()
    const daysIntoMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const monthProgress = daysIntoMonth / daysInMonth
    
    // Check each mode's depletion rate
    const modes = ['fast', 'balanced', 'precision'] as const
    for (const mode of modes) {
      const used = current[`${mode}_minutes`] || 0
      const limit = current[`${mode}_limit`] || 0
      
      if (limit > 0 && used > 0) {
        const usageRate = used / limit
        
        // Alert if usage rate significantly exceeds month progress
        if (usageRate > monthProgress * 2 && usageRate > 0.5) {
          anomalies.push({
            organizationId,
            type: 'rapid_depletion',
            severity: usageRate > 0.8 ? 'critical' : 'high',
            mode,
            details: {
              currentValue: Math.round(usageRate * 100),
              expectedValue: Math.round(monthProgress * 100),
              deviation: Math.round((usageRate / monthProgress - 1) * 100),
              timeWindow: `${daysIntoMonth} days`,
              description: `${mode} mode depleting rapidly: ${Math.round(usageRate * 100)}% used, only ${Math.round(monthProgress * 100)}% of month elapsed`
            },
            detectedAt: new Date()
          })
        }
      }
    }
    
    return anomalies
  }

  /**
   * Detect potential abuse of precision mode
   */
  private async detectModeAbuse(
    organizationId: string,
    current: any
  ): Promise<UsageAnomaly[]> {
    const anomalies: UsageAnomaly[] = []
    
    // Check if precision mode is being used for short recordings
    const { data: recentPrecision } = await this.supabase
      .from('meetings')
      .select('duration_seconds')
      .eq('organization_id', organizationId)
      .eq('transcription_mode', 'precision')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (recentPrecision && recentPrecision.length > 5) {
      const avgDuration = recentPrecision.reduce((sum, m) => sum + m.duration_seconds, 0) / recentPrecision.length
      
      // Flag if average precision meeting is under 5 minutes
      if (avgDuration < 300) {
        anomalies.push({
          organizationId,
          type: 'mode_abuse',
          severity: 'medium',
          mode: 'precision',
          details: {
            currentValue: Math.round(avgDuration / 60),
            expectedValue: 15,
            deviation: -Math.round((1 - avgDuration / 900) * 100),
            timeWindow: '24 hours',
            description: `Precision mode potentially misused for short recordings: avg ${Math.round(avgDuration / 60)} minutes`
          },
          detectedAt: new Date()
        })
      }
    }
    
    // Check balanced-to-precision ratio
    const balancedMinutes = current.balanced_minutes || 0
    const precisionMinutes = current.precision_minutes || 0
    
    if (precisionMinutes > balancedMinutes * 0.5 && precisionMinutes > 100) {
      anomalies.push({
        organizationId,
        type: 'mode_abuse',
        severity: 'low',
        mode: 'precision',
        details: {
          currentValue: precisionMinutes,
          expectedValue: Math.round(balancedMinutes * 0.2),
          deviation: Math.round((precisionMinutes / (balancedMinutes * 0.2) - 1) * 100),
          timeWindow: 'current month',
          description: `High precision mode usage ratio: ${precisionMinutes} precision vs ${balancedMinutes} balanced minutes`
        },
        detectedAt: new Date()
      })
    }
    
    return anomalies
  }

  /**
   * Detect excessive concurrent transcriptions
   */
  private async detectConcurrentExcess(
    organizationId: string,
    concurrentSessions: number
  ): Promise<UsageAnomaly[]> {
    const anomalies: UsageAnomaly[] = []
    
    // Get organization size for context
    const { data: org } = await this.supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single()
    
    const expectedConcurrent = {
      trial: 1,
      indulo: 2,
      profi: 5,
      vallalati: 10,
      multinational: 20
    }[org?.subscription_tier || 'trial'] || 5
    
    if (concurrentSessions > expectedConcurrent * 2) {
      anomalies.push({
        organizationId,
        type: 'concurrent_excess',
        severity: concurrentSessions > expectedConcurrent * 5 ? 'critical' : 'high',
        mode: 'fast', // Default, as this affects all modes
        details: {
          currentValue: concurrentSessions,
          expectedValue: expectedConcurrent,
          deviation: Math.round((concurrentSessions / expectedConcurrent - 1) * 100),
          timeWindow: 'current',
          description: `Excessive concurrent transcriptions: ${concurrentSessions} active (expected max ${expectedConcurrent})`
        },
        detectedAt: new Date()
      })
    }
    
    return anomalies
  }

  /**
   * Get historical usage patterns
   */
  private async getUsageHistory(organizationId: string): Promise<UsagePattern> {
    const { data: history } = await this.supabase
      .from('mode_usage')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('month', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('month', { ascending: false })
    
    // Calculate patterns
    const weeklyAverage = history
      ? history.reduce((sum, h) => sum + h.fast_minutes + h.balanced_minutes + h.precision_minutes, 0) / (history.length || 1) / 4
      : 0
    
    return {
      organizationId,
      mode: 'fast',
      hourlyUsage: [],
      dailyUsage: [],
      weeklyAverage,
      monthlyTotal: history?.[0]?.fast_minutes + history?.[0]?.balanced_minutes + history?.[0]?.precision_minutes || 0
    }
  }

  /**
   * Get current usage including recent activity
   */
  private async getCurrentUsage(organizationId: string): Promise<any> {
    // Get current month usage
    const { data: usage } = await this.supabase
      .rpc('get_current_month_usage', { p_organization_id: organizationId })
      .single()
    
    // Get last hour usage
    const { data: recentMeetings } = await this.supabase
      .from('meetings')
      .select('transcription_mode, duration_seconds')
      .eq('organization_id', organizationId)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
    
    const lastHourByMode = {
      fast_last_hour: 0,
      balanced_last_hour: 0,
      precision_last_hour: 0
    }
    
    recentMeetings?.forEach(meeting => {
      const minutes = Math.ceil(meeting.duration_seconds / 60)
      lastHourByMode[`${meeting.transcription_mode}_last_hour`] += minutes
    })
    
    return {
      ...usage,
      ...lastHourByMode
    }
  }

  /**
   * Get number of concurrent transcription sessions
   */
  private async getConcurrentSessions(organizationId: string): Promise<number> {
    const { data: activeMeetings } = await this.supabase
      .from('meetings')
      .select('id')
      .eq('organization_id', organizationId)
      .in('status', ['processing', 'uploading'])
    
    return activeMeetings?.length || 0
  }

  /**
   * Calculate anomaly risk score
   */
  calculateRiskScore(anomalies: UsageAnomaly[]): number {
    const severityScores = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 10
    }
    
    return anomalies.reduce((score, anomaly) => {
      return score + severityScores[anomaly.severity]
    }, 0)
  }
}