import { captureMessage } from './sentry'
import { trackError } from './vercel-analytics'
import { sendEmail } from '@/lib/email/email-service'
import { createClient } from '@/lib/supabase/server'

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  title: string
  description: string
  metadata?: Record<string, any>
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
}

export type AlertType = 
  | 'system_health'
  | 'api_error_rate'
  | 'response_time'
  | 'uptime'
  | 'queue_failure'
  | 'business_metric'
  | 'security'
  | 'capacity'

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface AlertRule {
  id: string
  name: string
  type: AlertType
  condition: (value: any) => boolean
  severity: AlertSeverity
  threshold: number
  message: string
  cooldown: number // minutes
}

// Default alert rules
export const ALERT_RULES: AlertRule[] = [
  {
    id: 'cpu_high',
    name: 'High CPU Usage',
    type: 'system_health',
    condition: (cpu: number) => cpu > 90,
    severity: 'critical',
    threshold: 90,
    message: 'CPU usage exceeded 90%',
    cooldown: 15,
  },
  {
    id: 'memory_high',
    name: 'High Memory Usage',
    type: 'system_health',
    condition: (memory: number) => memory > 85,
    severity: 'warning',
    threshold: 85,
    message: 'Memory usage exceeded 85%',
    cooldown: 15,
  },
  {
    id: 'api_errors_high',
    name: 'High API Error Rate',
    type: 'api_error_rate',
    condition: (errorRate: number) => errorRate > 5,
    severity: 'error',
    threshold: 5,
    message: 'API error rate exceeded 5%',
    cooldown: 10,
  },
  {
    id: 'response_time_slow',
    name: 'Slow Response Times',
    type: 'response_time',
    condition: (avgTime: number) => avgTime > 1000,
    severity: 'warning',
    threshold: 1000,
    message: 'Average response time exceeded 1000ms',
    cooldown: 10,
  },
  {
    id: 'service_down',
    name: 'Service Down',
    type: 'uptime',
    condition: (uptime: number) => uptime < 99,
    severity: 'critical',
    threshold: 99,
    message: 'Service uptime fell below 99%',
    cooldown: 5,
  },
  {
    id: 'queue_backed_up',
    name: 'Queue Backed Up',
    type: 'queue_failure',
    condition: (waiting: number) => waiting > 100,
    severity: 'warning',
    threshold: 100,
    message: 'Queue has more than 100 waiting jobs',
    cooldown: 20,
  },
  {
    id: 'low_conversion',
    name: 'Low Conversion Rate',
    type: 'business_metric',
    condition: (rate: number) => rate < 1,
    severity: 'info',
    threshold: 1,
    message: 'Conversion rate dropped below 1%',
    cooldown: 60,
  },
  {
    id: 'high_churn',
    name: 'High Churn Rate',
    type: 'business_metric',
    condition: (churn: number) => churn > 10,
    severity: 'error',
    threshold: 10,
    message: 'Monthly churn rate exceeded 10%',
    cooldown: 1440, // 24 hours
  },
]

export class AlertManager {
  private static activeAlerts: Map<string, Alert> = new Map()
  private static lastAlertTime: Map<string, Date> = new Map()
  
  /**
   * Check if a condition triggers an alert
   */
  static async checkCondition(
    ruleId: string,
    value: any,
    metadata?: Record<string, any>
  ): Promise<void> {
    const rule = ALERT_RULES.find(r => r.id === ruleId)
    if (!rule) return
    
    const shouldAlert = rule.condition(value)
    const alertKey = `${rule.id}:${JSON.stringify(metadata || {})}`
    
    if (shouldAlert) {
      // Check cooldown
      const lastAlert = this.lastAlertTime.get(alertKey)
      if (lastAlert) {
        const cooldownEnd = new Date(lastAlert.getTime() + rule.cooldown * 60 * 1000)
        if (new Date() < cooldownEnd) {
          return // Still in cooldown
        }
      }
      
      // Create alert
      const alert: Alert = {
        id: `${rule.id}-${Date.now()}`,
        type: rule.type,
        severity: rule.severity,
        title: rule.name,
        description: `${rule.message} (current value: ${value})`,
        metadata: {
          ...metadata,
          value,
          threshold: rule.threshold,
        },
        timestamp: new Date(),
        resolved: false,
      }
      
      await this.createAlert(alert)
      this.lastAlertTime.set(alertKey, new Date())
    } else {
      // Resolve existing alert if condition is no longer met
      const existingAlert = Array.from(this.activeAlerts.values()).find(
        a => a.type === rule.type && !a.resolved
      )
      
      if (existingAlert) {
        await this.resolveAlert(existingAlert.id)
      }
    }
  }
  
  /**
   * Create a new alert
   */
  static async createAlert(alert: Alert): Promise<void> {
    this.activeAlerts.set(alert.id, alert)
    
    // Send to Sentry
    captureMessage(`Alert: ${alert.title}`, alert.severity as any, {
      metadata: alert.metadata,
    })
    
    // Track in analytics
    trackError('alert_triggered', {
      alert_type: alert.type,
      severity: alert.severity,
      title: alert.title,
      ...alert.metadata,
    })
    
    // Send notifications based on severity
    await this.sendNotifications(alert)
    
    // Store in database
    await this.storeAlert(alert)
  }
  
  /**
   * Resolve an alert
   */
  static async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId)
    if (!alert || alert.resolved) return
    
    alert.resolved = true
    alert.resolvedAt = new Date()
    
    // Update in database
    const supabase = await createClient()
    await supabase
      .from('alerts')
      .update({
        resolved: true,
        resolved_at: alert.resolvedAt.toISOString(),
      })
      .eq('id', alert.id)
    
    // Track resolution
    trackError('alert_resolved', {
      alert_type: alert.type,
      severity: alert.severity,
      title: alert.title,
      duration_minutes: Math.round(
        (alert.resolvedAt.getTime() - alert.timestamp.getTime()) / 60000
      ),
    })
  }
  
  /**
   * Send notifications for an alert
   */
  private static async sendNotifications(alert: Alert): Promise<void> {
    // Only send email for error and critical alerts
    if (alert.severity === 'error' || alert.severity === 'critical') {
      try {
        // Get admin emails
        const supabase = await createClient()
        const { data: admins } = await supabase
          .from('users')
          .select('email')
          .eq('role', 'admin')
        
        if (admins && admins.length > 0) {
          for (const admin of admins) {
            await sendEmail({
              to: admin.email,
              subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
              template: 'alert-notification',
              data: {
                alertTitle: alert.title,
                alertDescription: alert.description,
                severity: alert.severity,
                timestamp: alert.timestamp.toISOString(),
                metadata: alert.metadata,
              },
            })
          }
        }
      } catch (error) {
        console.error('Failed to send alert notifications:', error)
      }
    }
    
    // For critical alerts, also send to external monitoring service
    if (alert.severity === 'critical') {
      // Could integrate with PagerDuty, Opsgenie, etc.
      console.log('Critical alert:', alert)
    }
  }
  
  /**
   * Store alert in database
   */
  private static async storeAlert(alert: Alert): Promise<void> {
    try {
      const supabase = await createClient()
      await supabase.from('alerts').insert({
        id: alert.id,
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        metadata: alert.metadata,
        timestamp: alert.timestamp.toISOString(),
        resolved: alert.resolved,
      })
    } catch (error) {
      console.error('Failed to store alert:', error)
    }
  }
  
  /**
   * Get active alerts
   */
  static getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(a => !a.resolved)
  }
  
  /**
   * Get alert history
   */
  static async getAlertHistory(
    hours: number = 24,
    type?: AlertType,
    severity?: AlertSeverity
  ): Promise<Alert[]> {
    const supabase = await createClient()
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    let query = supabase
      .from('alerts')
      .select('*')
      .gte('timestamp', cutoffTime.toISOString())
      .order('timestamp', { ascending: false })
    
    if (type) query = query.eq('type', type)
    if (severity) query = query.eq('severity', severity)
    
    const { data, error } = await query
    
    if (error) {
      console.error('Failed to fetch alert history:', error)
      return []
    }
    
    return data.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp),
      resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
    }))
  }
  
  /**
   * Run all alert checks
   */
  static async runChecks(metrics: Record<string, any>): Promise<void> {
    // System health checks
    if (metrics.system) {
      await this.checkCondition('cpu_high', metrics.system.cpu)
      await this.checkCondition('memory_high', metrics.system.memory)
    }
    
    // API checks
    if (metrics.api) {
      const avgErrorRate = metrics.api.reduce((sum: number, endpoint: any) => 
        sum + endpoint.errorRate, 0) / metrics.api.length
      await this.checkCondition('api_errors_high', avgErrorRate)
      
      const avgResponseTime = metrics.api.reduce((sum: number, endpoint: any) => 
        sum + endpoint.avgResponseTime, 0) / metrics.api.length
      await this.checkCondition('response_time_slow', avgResponseTime)
    }
    
    // Queue checks
    if (metrics.queues) {
      for (const queue of metrics.queues) {
        await this.checkCondition('queue_backed_up', queue.waiting, {
          queue_name: queue.name,
        })
      }
    }
    
    // Business metrics checks
    if (metrics.business) {
      if (metrics.business.conversion) {
        await this.checkCondition('low_conversion', metrics.business.conversion.overallConversion)
      }
      if (metrics.business.revenue) {
        await this.checkCondition('high_churn', metrics.business.revenue.churn)
      }
    }
  }
}

// Export function to run periodic alert checks
export async function checkAlerts() {
  try {
    // Collect current metrics
    const [systemResponse, apiResponse, queueResponse, businessResponse] = await Promise.all([
      fetch('/api/monitoring/system'),
      fetch('/api/monitoring/api'),
      fetch('/api/monitoring/queue'),
      fetch('/api/monitoring/business?range=30d'),
    ])
    
    const metrics = {
      system: await systemResponse.json(),
      api: await apiResponse.json(),
      queues: await queueResponse.json(),
      business: await businessResponse.json(),
    }
    
    // Run alert checks
    await AlertManager.runChecks(metrics)
  } catch (error) {
    console.error('Failed to check alerts:', error)
  }
}