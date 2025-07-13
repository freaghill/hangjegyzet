import { captureException } from './sentry'
import { trackError, trackPerformance } from './vercel-analytics'

export interface UptimeCheck {
  name: string
  url: string
  interval: number // minutes
  timeout: number // milliseconds
  expectedStatus?: number
  expectedText?: string
  headers?: Record<string, string>
}

export interface UptimeResult {
  checkName: string
  status: 'up' | 'down' | 'degraded'
  responseTime: number
  statusCode?: number
  error?: string
  timestamp: Date
}

// Default uptime checks
export const UPTIME_CHECKS: UptimeCheck[] = [
  {
    name: 'Homepage',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://hangjegyzet.hu',
    interval: 5,
    timeout: 10000,
    expectedStatus: 200,
  },
  {
    name: 'API Health',
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/health`,
    interval: 5,
    timeout: 5000,
    expectedStatus: 200,
    expectedText: 'ok',
  },
  {
    name: 'Auth Service',
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/session`,
    interval: 10,
    timeout: 5000,
    expectedStatus: 200,
  },
  {
    name: 'Supabase',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/',
    interval: 10,
    timeout: 5000,
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
  {
    name: 'Storage Service',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/bucket',
    interval: 15,
    timeout: 5000,
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
  },
]

export class UptimeMonitor {
  private static checks: Map<string, NodeJS.Timeout> = new Map()
  private static results: Map<string, UptimeResult[]> = new Map()
  
  /**
   * Start monitoring all uptime checks
   */
  static start() {
    console.log('Starting uptime monitoring...')
    
    UPTIME_CHECKS.forEach(check => {
      this.startCheck(check)
    })
  }
  
  /**
   * Stop all uptime monitoring
   */
  static stop() {
    console.log('Stopping uptime monitoring...')
    
    this.checks.forEach((timeout, name) => {
      clearInterval(timeout)
    })
    this.checks.clear()
  }
  
  /**
   * Start monitoring a specific check
   */
  private static startCheck(check: UptimeCheck) {
    // Run immediately
    this.performCheck(check)
    
    // Then schedule periodic checks
    const interval = setInterval(() => {
      this.performCheck(check)
    }, check.interval * 60 * 1000)
    
    this.checks.set(check.name, interval)
  }
  
  /**
   * Perform a single uptime check
   */
  private static async performCheck(check: UptimeCheck) {
    const startTime = Date.now()
    let result: UptimeResult
    
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), check.timeout)
      
      const response = await fetch(check.url, {
        method: 'GET',
        headers: check.headers,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      const responseTime = Date.now() - startTime
      const statusCode = response.status
      
      // Check status code
      if (check.expectedStatus && statusCode !== check.expectedStatus) {
        result = {
          checkName: check.name,
          status: 'down',
          responseTime,
          statusCode,
          error: `Expected status ${check.expectedStatus}, got ${statusCode}`,
          timestamp: new Date(),
        }
      }
      // Check response text if specified
      else if (check.expectedText) {
        const text = await response.text()
        if (!text.includes(check.expectedText)) {
          result = {
            checkName: check.name,
            status: 'down',
            responseTime,
            statusCode,
            error: `Expected text "${check.expectedText}" not found`,
            timestamp: new Date(),
          }
        } else {
          result = {
            checkName: check.name,
            status: 'up',
            responseTime,
            statusCode,
            timestamp: new Date(),
          }
        }
      }
      // Otherwise just check if request succeeded
      else {
        result = {
          checkName: check.name,
          status: response.ok ? 'up' : 'down',
          responseTime,
          statusCode,
          error: response.ok ? undefined : `HTTP ${statusCode}`,
          timestamp: new Date(),
        }
      }
      
      // Check for degraded performance
      if (result.status === 'up' && responseTime > check.timeout * 0.8) {
        result.status = 'degraded'
      }
      
    } catch (error) {
      result = {
        checkName: check.name,
        status: 'down',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      }
    }
    
    // Store result
    this.storeResult(result)
    
    // Track metrics
    this.trackResult(result)
    
    // Handle alerts
    this.handleAlerts(check, result)
  }
  
  /**
   * Store uptime result
   */
  private static storeResult(result: UptimeResult) {
    const results = this.results.get(result.checkName) || []
    results.push(result)
    
    // Keep only last 24 hours of results
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentResults = results.filter(r => r.timestamp > cutoffTime)
    
    this.results.set(result.checkName, recentResults)
  }
  
  /**
   * Track uptime metrics
   */
  private static trackResult(result: UptimeResult) {
    // Track response time
    trackPerformance('uptime_check_response_time', result.responseTime, {
      check_name: result.checkName,
      status: result.status,
      unit: 'milliseconds',
    })
    
    // Track status
    if (result.status !== 'up') {
      trackError('uptime_check_failed', {
        check_name: result.checkName,
        status: result.status,
        error: result.error,
        severity: result.status === 'down' ? 'high' : 'medium',
      })
    }
  }
  
  /**
   * Handle alerts for failed checks
   */
  private static handleAlerts(check: UptimeCheck, result: UptimeResult) {
    if (result.status === 'down') {
      // Check if this is a repeated failure
      const recentResults = this.results.get(check.name) || []
      const recentFailures = recentResults
        .slice(-3)
        .filter(r => r.status === 'down')
        .length
      
      if (recentFailures >= 3) {
        // Service is consistently down
        captureException(new Error(`Service ${check.name} is down`), {
          action: 'uptime_check',
          metadata: {
            check_name: check.name,
            url: check.url,
            error: result.error,
            consecutive_failures: recentFailures,
          },
        })
      }
    }
  }
  
  /**
   * Get uptime statistics for a check
   */
  static getUptimeStats(checkName: string, hours: number = 24) {
    const results = this.results.get(checkName) || []
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const recentResults = results.filter(r => r.timestamp > cutoffTime)
    
    if (recentResults.length === 0) {
      return {
        uptime: 0,
        avgResponseTime: 0,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
      }
    }
    
    const successfulChecks = recentResults.filter(r => r.status === 'up').length
    const totalResponseTime = recentResults.reduce((sum, r) => sum + r.responseTime, 0)
    
    return {
      uptime: (successfulChecks / recentResults.length) * 100,
      avgResponseTime: totalResponseTime / recentResults.length,
      totalChecks: recentResults.length,
      successfulChecks,
      failedChecks: recentResults.length - successfulChecks,
    }
  }
  
  /**
   * Get all uptime statistics
   */
  static getAllUptimeStats(hours: number = 24) {
    const stats: Record<string, any> = {}
    
    UPTIME_CHECKS.forEach(check => {
      stats[check.name] = {
        ...this.getUptimeStats(check.name, hours),
        url: check.url,
        interval: check.interval,
      }
    })
    
    return stats
  }
}

// Export function to start monitoring (to be called from server initialization)
export function startUptimeMonitoring() {
  if (process.env.NODE_ENV === 'production') {
    UptimeMonitor.start()
  }
}