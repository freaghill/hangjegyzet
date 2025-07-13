import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'

// Initialize Redis client (you'll need to add @upstash/redis to dependencies)
// For now, we'll use in-memory storage as fallback
class InMemoryRateLimiter {
  private storage = new Map<string, { count: number; resetAt: number }>()
  
  async increment(key: string, window: number): Promise<{ count: number; remaining: number; resetAt: number }> {
    const now = Date.now()
    const existing = this.storage.get(key)
    
    if (!existing || existing.resetAt < now) {
      const resetAt = now + window * 1000
      this.storage.set(key, { count: 1, resetAt })
      return { count: 1, remaining: window - 1, resetAt }
    }
    
    existing.count++
    return { 
      count: existing.count, 
      remaining: Math.max(0, window - existing.count), 
      resetAt: existing.resetAt 
    }
  }
  
  async reset(key: string): Promise<void> {
    this.storage.delete(key)
  }
  
  async get(key: string): Promise<{ count: number; resetAt: number } | null> {
    const existing = this.storage.get(key)
    if (!existing || existing.resetAt < Date.now()) return null
    return existing
  }
}

export interface RateLimitConfig {
  precision: {
    perHour: number
    perDay: number
    perMeeting: number // Max duration in minutes
  }
  balanced: {
    perHour: number
    perDay: number
  }
  fast: {
    perHour: number
    concurrent: number
  }
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: Date
  reason?: string
}

export class RateLimiter {
  private supabase: SupabaseClient
  private limiter: InMemoryRateLimiter
  
  // Default rate limits by subscription tier
  private readonly configs: Record<string, RateLimitConfig> = {
    trial: {
      precision: { perHour: 0, perDay: 0, perMeeting: 0 },
      balanced: { perHour: 10, perDay: 20 },
      fast: { perHour: 50, concurrent: 1 }
    },
    indulo: {
      precision: { perHour: 0, perDay: 0, perMeeting: 0 },
      balanced: { perHour: 20, perDay: 50 },
      fast: { perHour: 100, concurrent: 2 }
    },
    profi: {
      precision: { perHour: 5, perDay: 10, perMeeting: 60 },
      balanced: { perHour: 50, perDay: 200 },
      fast: { perHour: 200, concurrent: 5 }
    },
    vallalati: {
      precision: { perHour: 10, perDay: 50, perMeeting: 120 },
      balanced: { perHour: 100, perDay: 500 },
      fast: { perHour: 500, concurrent: 10 }
    },
    multinational: {
      precision: { perHour: 50, perDay: 200, perMeeting: 180 },
      balanced: { perHour: 500, perDay: 2000 },
      fast: { perHour: -1, concurrent: 20 } // -1 means unlimited
    }
  }

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.limiter = new InMemoryRateLimiter()
  }

  /**
   * Check if a transcription request should be allowed
   */
  async checkLimit(
    organizationId: string,
    mode: 'fast' | 'balanced' | 'precision',
    estimatedMinutes: number
  ): Promise<RateLimitResult> {
    // Get organization's subscription tier
    const { data: org } = await this.supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single()
    
    if (!org) {
      return {
        allowed: false,
        limit: 0,
        remaining: 0,
        resetAt: new Date(),
        reason: 'Organization not found'
      }
    }
    
    const config = this.configs[org.subscription_tier] || this.configs.trial
    const modeConfig = config[mode]
    
    // Check concurrent limit for fast mode
    if (mode === 'fast' && modeConfig.concurrent > 0) {
      const concurrent = await this.checkConcurrent(organizationId)
      if (concurrent >= modeConfig.concurrent) {
        return {
          allowed: false,
          limit: modeConfig.concurrent,
          remaining: 0,
          resetAt: new Date(Date.now() + 60000), // Reset in 1 minute
          reason: `Maximum ${modeConfig.concurrent} concurrent fast transcriptions allowed`
        }
      }
    }
    
    // Check hourly limits
    if (modeConfig.perHour > 0) {
      const hourlyKey = `${organizationId}:${mode}:hourly`
      const hourlyResult = await this.limiter.increment(hourlyKey, 3600) // 1 hour window
      
      if (hourlyResult.count > modeConfig.perHour) {
        return {
          allowed: false,
          limit: modeConfig.perHour,
          remaining: 0,
          resetAt: new Date(hourlyResult.resetAt),
          reason: `Hourly limit of ${modeConfig.perHour} ${mode} transcriptions exceeded`
        }
      }
    }
    
    // Check daily limits
    if (modeConfig.perDay > 0) {
      const dailyKey = `${organizationId}:${mode}:daily`
      const dailyResult = await this.limiter.increment(dailyKey, 86400) // 24 hour window
      
      if (dailyResult.count > modeConfig.perDay) {
        return {
          allowed: false,
          limit: modeConfig.perDay,
          remaining: 0,
          resetAt: new Date(dailyResult.resetAt),
          reason: `Daily limit of ${modeConfig.perDay} ${mode} transcriptions exceeded`
        }
      }
    }
    
    // Check meeting duration limit for precision mode
    if (mode === 'precision' && modeConfig.perMeeting > 0) {
      if (estimatedMinutes > modeConfig.perMeeting) {
        return {
          allowed: false,
          limit: modeConfig.perMeeting,
          remaining: 0,
          resetAt: new Date(),
          reason: `Precision mode limited to ${modeConfig.perMeeting} minutes per meeting`
        }
      }
    }
    
    // All checks passed
    return {
      allowed: true,
      limit: modeConfig.perHour || -1,
      remaining: modeConfig.perHour ? modeConfig.perHour - (await this.getHourlyCount(organizationId, mode)) : -1,
      resetAt: new Date(Date.now() + 3600000)
    }
  }

  /**
   * Check burst protection - prevent rapid API calls
   */
  async checkBurstLimit(organizationId: string): Promise<RateLimitResult> {
    const burstKey = `${organizationId}:burst`
    const burstWindow = 60 // 60 seconds
    const burstLimit = 10 // Max 10 requests per minute
    
    const result = await this.limiter.increment(burstKey, burstWindow)
    
    if (result.count > burstLimit) {
      return {
        allowed: false,
        limit: burstLimit,
        remaining: 0,
        resetAt: new Date(result.resetAt),
        reason: 'Too many requests. Please wait before trying again.'
      }
    }
    
    return {
      allowed: true,
      limit: burstLimit,
      remaining: burstLimit - result.count,
      resetAt: new Date(result.resetAt)
    }
  }

  /**
   * Get current concurrent transcriptions
   */
  private async checkConcurrent(organizationId: string): Promise<number> {
    const { data: active } = await this.supabase
      .from('meetings')
      .select('id')
      .eq('organization_id', organizationId)
      .in('status', ['processing', 'uploading'])
    
    return active?.length || 0
  }

  /**
   * Get hourly usage count
   */
  private async getHourlyCount(organizationId: string, mode: string): Promise<number> {
    const hourlyKey = `${organizationId}:${mode}:hourly`
    const current = await this.limiter.get(hourlyKey)
    return current?.count || 0
  }

  /**
   * Reset rate limits for an organization (admin use)
   */
  async resetLimits(organizationId: string, mode?: string): Promise<void> {
    if (mode) {
      await this.limiter.reset(`${organizationId}:${mode}:hourly`)
      await this.limiter.reset(`${organizationId}:${mode}:daily`)
    } else {
      // Reset all modes
      const modes = ['fast', 'balanced', 'precision']
      for (const m of modes) {
        await this.limiter.reset(`${organizationId}:${m}:hourly`)
        await this.limiter.reset(`${organizationId}:${m}:daily`)
      }
      await this.limiter.reset(`${organizationId}:burst`)
    }
  }

  /**
   * Get current rate limit status for an organization
   */
  async getStatus(organizationId: string): Promise<Record<string, any>> {
    const { data: org } = await this.supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single()
    
    if (!org) return {}
    
    const config = this.configs[org.subscription_tier] || this.configs.trial
    const status: Record<string, any> = {}
    
    for (const mode of ['fast', 'balanced', 'precision'] as const) {
      const hourlyKey = `${organizationId}:${mode}:hourly`
      const dailyKey = `${organizationId}:${mode}:daily`
      
      const hourly = await this.limiter.get(hourlyKey)
      const daily = await this.limiter.get(dailyKey)
      
      status[mode] = {
        hourly: {
          used: hourly?.count || 0,
          limit: config[mode].perHour,
          resetAt: hourly?.resetAt ? new Date(hourly.resetAt) : null
        },
        daily: {
          used: daily?.count || 0,
          limit: config[mode].perDay,
          resetAt: daily?.resetAt ? new Date(daily.resetAt) : null
        }
      }
      
      if (mode === 'precision') {
        status[mode].perMeeting = config[mode].perMeeting
      }
      if (mode === 'fast') {
        status[mode].concurrent = {
          current: await this.checkConcurrent(organizationId),
          limit: config[mode].concurrent
        }
      }
    }
    
    return status
  }
}

// Create a singleton instance
let rateLimiterInstance: RateLimiter | null = null

export async function getRateLimiter(): Promise<RateLimiter> {
  if (!rateLimiterInstance) {
    const supabase = await createClient()
    rateLimiterInstance = new RateLimiter(supabase)
  }
  return rateLimiterInstance
}

// Export as default named export for compatibility
export const rateLimiter = {
  checkLimit: async (...args: Parameters<RateLimiter['checkLimit']>) => {
    const instance = await getRateLimiter()
    return instance.checkLimit(...args)
  },
  checkBurstLimit: async (...args: Parameters<RateLimiter['checkBurstLimit']>) => {
    const instance = await getRateLimiter()
    return instance.checkBurstLimit(...args)
  },
  resetLimits: async (...args: Parameters<RateLimiter['resetLimits']>) => {
    const instance = await getRateLimiter()
    return instance.resetLimits(...args)
  },
  getStatus: async (...args: Parameters<RateLimiter['getStatus']>) => {
    const instance = await getRateLimiter()
    return instance.getStatus(...args)
  }
}