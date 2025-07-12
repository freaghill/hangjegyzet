import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { AnomalyDetector, type UsageAnomaly } from './anomaly-detector'
import { Resend } from 'resend'

// Initialize Resend client (you'll need to add resend to dependencies)
// For now, we'll use console logging as fallback
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

export interface Alert {
  id: string
  organizationId: string
  type: 'anomaly' | 'limit_reached' | 'system' | 'security'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  metadata: Record<string, any>
  createdAt: Date
  resolved: boolean
  resolvedAt?: Date
  notificationsSent: string[]
}

export interface NotificationChannel {
  type: 'email' | 'webhook' | 'slack' | 'internal'
  config: Record<string, any>
  enabled: boolean
}

export class AlertingService {
  private supabase: SupabaseClient
  private anomalyDetector: AnomalyDetector

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
    this.anomalyDetector = new AnomalyDetector(supabase)
  }

  /**
   * Run anomaly detection for all organizations and create alerts
   */
  async runAnomalyDetection(): Promise<Alert[]> {
    const alerts: Alert[] = []
    
    try {
      // Get all active organizations
      const { data: organizations } = await this.supabase
        .from('organizations')
        .select('id, name, subscription_tier')
        .in('subscription_tier', ['profi', 'vallalati', 'multinational']) // Only monitor paid plans
      
      if (!organizations) return alerts
      
      // Check each organization for anomalies
      for (const org of organizations) {
        const anomalies = await this.anomalyDetector.detectAnomalies(org.id)
        
        for (const anomaly of anomalies) {
          // Only create alerts for medium+ severity
          if (['medium', 'high', 'critical'].includes(anomaly.severity)) {
            const alert = await this.createAlert({
              organizationId: org.id,
              type: 'anomaly',
              severity: anomaly.severity,
              title: this.getAnomalyTitle(anomaly),
              description: anomaly.details.description,
              metadata: {
                anomalyType: anomaly.type,
                mode: anomaly.mode,
                deviation: anomaly.details.deviation,
                currentValue: anomaly.details.currentValue,
                expectedValue: anomaly.details.expectedValue,
                organizationName: org.name
              }
            })
            
            if (alert) alerts.push(alert)
          }
        }
      }
      
      // Process and send notifications for new alerts
      await this.processAlerts(alerts)
      
    } catch (error) {
      console.error('Error in anomaly detection:', error)
    }
    
    return alerts
  }

  /**
   * Create a new alert
   */
  async createAlert(params: {
    organizationId: string
    type: Alert['type']
    severity: Alert['severity']
    title: string
    description: string
    metadata?: Record<string, any>
  }): Promise<Alert | null> {
    try {
      // Check if similar alert already exists
      const { data: existing } = await this.supabase
        .from('alerts')
        .select('id')
        .eq('organization_id', params.organizationId)
        .eq('type', params.type)
        .eq('title', params.title)
        .eq('resolved', false)
        .single()
      
      if (existing) return null // Don't create duplicate alerts
      
      const alert: Alert = {
        id: crypto.randomUUID(),
        organizationId: params.organizationId,
        type: params.type,
        severity: params.severity,
        title: params.title,
        description: params.description,
        metadata: params.metadata || {},
        createdAt: new Date(),
        resolved: false,
        notificationsSent: []
      }
      
      // Store alert in database
      const { error } = await this.supabase
        .from('alerts')
        .insert({
          id: alert.id,
          organization_id: alert.organizationId,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          description: alert.description,
          metadata: alert.metadata,
          created_at: alert.createdAt.toISOString(),
          resolved: alert.resolved,
          notifications_sent: alert.notificationsSent
        })
      
      if (error) {
        console.error('Error creating alert:', error)
        return null
      }
      
      return alert
    } catch (error) {
      console.error('Error in createAlert:', error)
      return null
    }
  }

  /**
   * Process alerts and send notifications
   */
  private async processAlerts(alerts: Alert[]): Promise<void> {
    // Group alerts by severity for batching
    const criticalAlerts = alerts.filter(a => a.severity === 'critical')
    const highAlerts = alerts.filter(a => a.severity === 'high')
    const mediumAlerts = alerts.filter(a => a.severity === 'medium')
    
    // Send immediate notifications for critical alerts
    for (const alert of criticalAlerts) {
      await this.sendNotifications(alert, ['email', 'slack', 'webhook'])
    }
    
    // Batch high alerts (every 5 minutes)
    if (highAlerts.length > 0) {
      await this.sendBatchedNotifications(highAlerts, ['email', 'slack'])
    }
    
    // Batch medium alerts (every hour)
    if (mediumAlerts.length > 0) {
      await this.sendBatchedNotifications(mediumAlerts, ['email'])
    }
  }

  /**
   * Send notifications for a single alert
   */
  private async sendNotifications(alert: Alert, channels: string[]): Promise<void> {
    const sentChannels: string[] = []
    
    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailAlert(alert)
            sentChannels.push('email')
            break
          case 'slack':
            await this.sendSlackAlert(alert)
            sentChannels.push('slack')
            break
          case 'webhook':
            await this.sendWebhookAlert(alert)
            sentChannels.push('webhook')
            break
        }
      } catch (error) {
        console.error(`Error sending ${channel} notification:`, error)
      }
    }
    
    // Update alert with sent notifications
    if (sentChannels.length > 0) {
      await this.supabase
        .from('alerts')
        .update({ notifications_sent: sentChannels })
        .eq('id', alert.id)
    }
  }

  /**
   * Send batched notifications
   */
  private async sendBatchedNotifications(alerts: Alert[], channels: string[]): Promise<void> {
    // Group by organization
    const byOrg = alerts.reduce((acc, alert) => {
      if (!acc[alert.organizationId]) acc[alert.organizationId] = []
      acc[alert.organizationId].push(alert)
      return acc
    }, {} as Record<string, Alert[]>)
    
    for (const [orgId, orgAlerts] of Object.entries(byOrg)) {
      const summary = this.createAlertSummary(orgAlerts)
      
      // Send summary notification
      if (channels.includes('email')) {
        await this.sendEmailSummary(orgId, summary)
      }
      if (channels.includes('slack')) {
        await this.sendSlackSummary(orgId, summary)
      }
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert): Promise<void> {
    if (!resend) {
      console.log('EMAIL ALERT:', alert)
      return
    }
    
    // Get admin emails
    const { data: admins } = await this.supabase
      .from('profiles')
      .select('email')
      .eq('role', 'admin')
    
    if (!admins || admins.length === 0) return
    
    const emailHtml = `
      <h2>🚨 ${alert.severity.toUpperCase()} Alert: ${alert.title}</h2>
      <p><strong>Organization:</strong> ${alert.metadata.organizationName || alert.organizationId}</p>
      <p><strong>Time:</strong> ${alert.createdAt.toLocaleString()}</p>
      <p><strong>Description:</strong> ${alert.description}</p>
      
      ${alert.metadata.currentValue ? `
        <h3>Details:</h3>
        <ul>
          <li>Current Value: ${alert.metadata.currentValue}</li>
          <li>Expected Value: ${alert.metadata.expectedValue}</li>
          <li>Deviation: ${alert.metadata.deviation}%</li>
        </ul>
      ` : ''}
      
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/monitoring">View in Dashboard</a></p>
    `
    
    await resend.emails.send({
      from: 'alerts@hangjegyzet.hu',
      to: admins.map(a => a.email),
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html: emailHtml
    })
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      console.log('SLACK ALERT:', alert)
      return
    }
    
    const color = {
      critical: '#dc2626',
      high: '#ea580c',
      medium: '#eab308',
      low: '#3b82f6'
    }[alert.severity]
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title: `${alert.severity.toUpperCase()}: ${alert.title}`,
          text: alert.description,
          fields: [
            {
              title: 'Organization',
              value: alert.metadata.organizationName || alert.organizationId,
              short: true
            },
            {
              title: 'Time',
              value: alert.createdAt.toLocaleString(),
              short: true
            },
            ...(alert.metadata.currentValue ? [
              {
                title: 'Current/Expected',
                value: `${alert.metadata.currentValue} / ${alert.metadata.expectedValue}`,
                short: true
              },
              {
                title: 'Deviation',
                value: `${alert.metadata.deviation}%`,
                short: true
              }
            ] : [])
          ],
          actions: [{
            type: 'button',
            text: 'View Dashboard',
            url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/monitoring`
          }]
        }]
      })
    })
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert): Promise<void> {
    // Get organization's webhook URL if configured
    const { data: org } = await this.supabase
      .from('organizations')
      .select('webhook_url')
      .eq('id', alert.organizationId)
      .single()
    
    if (!org?.webhook_url) return
    
    try {
      await fetch(org.webhook_url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-HangJegyzet-Event': 'usage.alert'
        },
        body: JSON.stringify({
          event: 'usage.alert',
          alert: {
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            title: alert.title,
            description: alert.description,
            metadata: alert.metadata,
            timestamp: alert.createdAt.toISOString()
          }
        })
      })
    } catch (error) {
      console.error('Webhook delivery failed:', error)
    }
  }

  /**
   * Create alert summary for batched notifications
   */
  private createAlertSummary(alerts: Alert[]): string {
    const bySeverity = alerts.reduce((acc, alert) => {
      if (!acc[alert.severity]) acc[alert.severity] = 0
      acc[alert.severity]++
      return acc
    }, {} as Record<string, number>)
    
    const lines = [
      `You have ${alerts.length} new alerts:`,
      ...Object.entries(bySeverity).map(([severity, count]) => 
        `- ${count} ${severity} severity alert${count > 1 ? 's' : ''}`
      ),
      '',
      'Top alerts:',
      ...alerts.slice(0, 5).map(a => `- ${a.title}`)
    ]
    
    return lines.join('\n')
  }

  /**
   * Send email summary
   */
  private async sendEmailSummary(organizationId: string, summary: string): Promise<void> {
    // Implementation similar to sendEmailAlert but with summary content
    console.log('EMAIL SUMMARY:', organizationId, summary)
  }

  /**
   * Send Slack summary
   */
  private async sendSlackSummary(organizationId: string, summary: string): Promise<void> {
    // Implementation similar to sendSlackAlert but with summary content
    console.log('SLACK SUMMARY:', organizationId, summary)
  }

  /**
   * Get title for anomaly type
   */
  private getAnomalyTitle(anomaly: UsageAnomaly): string {
    const titles = {
      spike: `Usage Spike Detected - ${anomaly.mode} mode`,
      unusual_pattern: `Unusual Usage Pattern - ${anomaly.mode} mode`,
      rapid_depletion: `Rapid Credit Depletion - ${anomaly.mode} mode`,
      mode_abuse: `Potential Mode Abuse - ${anomaly.mode} mode`,
      concurrent_excess: 'Excessive Concurrent Transcriptions'
    }
    
    return titles[anomaly.type] || 'Usage Anomaly Detected'
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<void> {
    await this.supabase
      .from('alerts')
      .update({
        resolved: true,
        resolved_at: new Date().toISOString(),
        metadata: {
          resolved_by: resolvedBy
        }
      })
      .eq('id', alertId)
  }

  /**
   * Get active alerts for an organization
   */
  async getActiveAlerts(organizationId?: string): Promise<Alert[]> {
    let query = this.supabase
      .from('alerts')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }
    
    const { data } = await query
    
    return data?.map(this.mapDatabaseAlert) || []
  }

  /**
   * Map database record to Alert type
   */
  private mapDatabaseAlert(record: any): Alert {
    return {
      id: record.id,
      organizationId: record.organization_id,
      type: record.type,
      severity: record.severity,
      title: record.title,
      description: record.description,
      metadata: record.metadata || {},
      createdAt: new Date(record.created_at),
      resolved: record.resolved,
      resolvedAt: record.resolved_at ? new Date(record.resolved_at) : undefined,
      notificationsSent: record.notifications_sent || []
    }
  }
}