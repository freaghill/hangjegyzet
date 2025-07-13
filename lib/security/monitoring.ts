import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

// Security event types
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  PASSWORD_CHANGE = 'password_change',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  MFA_CHALLENGE_SUCCESS = 'mfa_challenge_success',
  MFA_CHALLENGE_FAILED = 'mfa_challenge_failed',
  
  // Authorization events
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  PERMISSION_DENIED = 'permission_denied',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  
  // Security threats
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',
  PATH_TRAVERSAL_ATTEMPT = 'path_traversal_attempt',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  
  // Data security
  DATA_EXPORT = 'data_export',
  DATA_DELETION = 'data_deletion',
  ENCRYPTION_KEY_ROTATION = 'encryption_key_rotation',
  
  // Compliance
  GDPR_REQUEST = 'gdpr_request',
  CONSENT_UPDATED = 'consent_updated',
  
  // System security
  SECURITY_CONFIG_CHANGE = 'security_config_change',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  API_KEY_CREATED = 'api_key_created',
  API_KEY_REVOKED = 'api_key_revoked',
}

// Security event severity
export enum SecuritySeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Security event interface
export interface SecurityEvent {
  id?: string
  type: SecurityEventType
  severity: SecuritySeverity
  userId?: string
  ipAddress?: string
  userAgent?: string
  path?: string
  method?: string
  metadata?: Record<string, any>
  timestamp?: Date
}

// Security monitoring service
export class SecurityMonitoring {
  // Log security event
  static async logEvent(event: SecurityEvent): Promise<void> {
    const supabase = await createClient()
    
    // Generate event ID
    const eventId = event.id || crypto.randomUUID()
    
    // Determine severity if not provided
    const severity = event.severity || this.determineSeverity(event.type)
    
    try {
      await supabase
        .from('security_events')
        .insert({
          id: eventId,
          type: event.type,
          severity,
          user_id: event.userId,
          ip_address: event.ipAddress,
          user_agent: event.userAgent,
          path: event.path,
          method: event.method,
          metadata: event.metadata || {},
          created_at: event.timestamp || new Date(),
        })
      
      // Trigger alerts for high severity events
      if (severity === SecuritySeverity.HIGH || severity === SecuritySeverity.CRITICAL) {
        await this.triggerSecurityAlert(event, severity)
      }
      
      // Check for patterns that indicate attacks
      await this.analyzeSecurityPatterns(event)
    } catch (error) {
      console.error('Failed to log security event:', error)
      // Fallback to console logging
      console.warn('[SECURITY EVENT]', { ...event, severity })
    }
  }
  
  // Determine event severity
  private static determineSeverity(type: SecurityEventType): SecuritySeverity {
    const severityMap: Record<SecurityEventType, SecuritySeverity> = {
      // Info level
      [SecurityEventType.LOGIN_SUCCESS]: SecuritySeverity.INFO,
      [SecurityEventType.LOGOUT]: SecuritySeverity.INFO,
      [SecurityEventType.CONSENT_UPDATED]: SecuritySeverity.INFO,
      
      // Low level
      [SecurityEventType.LOGIN_FAILED]: SecuritySeverity.LOW,
      [SecurityEventType.PASSWORD_RESET_REQUEST]: SecuritySeverity.LOW,
      [SecurityEventType.MFA_CHALLENGE_FAILED]: SecuritySeverity.LOW,
      
      // Medium level
      [SecurityEventType.UNAUTHORIZED_ACCESS]: SecuritySeverity.MEDIUM,
      [SecurityEventType.PERMISSION_DENIED]: SecuritySeverity.MEDIUM,
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: SecuritySeverity.MEDIUM,
      [SecurityEventType.DATA_EXPORT]: SecuritySeverity.MEDIUM,
      
      // High level
      [SecurityEventType.BRUTE_FORCE_ATTEMPT]: SecuritySeverity.HIGH,
      [SecurityEventType.PRIVILEGE_ESCALATION]: SecuritySeverity.HIGH,
      [SecurityEventType.DATA_DELETION]: SecuritySeverity.HIGH,
      [SecurityEventType.API_KEY_CREATED]: SecuritySeverity.HIGH,
      
      // Critical level
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: SecuritySeverity.CRITICAL,
      [SecurityEventType.XSS_ATTEMPT]: SecuritySeverity.CRITICAL,
      [SecurityEventType.CSRF_ATTEMPT]: SecuritySeverity.CRITICAL,
      [SecurityEventType.PATH_TRAVERSAL_ATTEMPT]: SecuritySeverity.CRITICAL,
      [SecurityEventType.ENCRYPTION_KEY_ROTATION]: SecuritySeverity.CRITICAL,
      [SecurityEventType.SECURITY_CONFIG_CHANGE]: SecuritySeverity.CRITICAL,
    }
    
    return severityMap[type] || SecuritySeverity.INFO
  }
  
  // Trigger security alerts
  private static async triggerSecurityAlert(
    event: SecurityEvent,
    severity: SecuritySeverity
  ): Promise<void> {
    // Send to monitoring service
    if (process.env.SECURITY_WEBHOOK_URL) {
      try {
        await fetch(process.env.SECURITY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: 'Security Event',
            severity,
            event,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
          }),
        })
      } catch (error) {
        console.error('Failed to send security alert:', error)
      }
    }
    
    // Send email to security team
    if (process.env.SECURITY_EMAIL) {
      // Implement email notification
    }
    
    // Log to external SIEM if configured
    if (process.env.SIEM_ENDPOINT) {
      // Implement SIEM integration
    }
  }
  
  // Analyze patterns for attack detection
  private static async analyzeSecurityPatterns(event: SecurityEvent): Promise<void> {
    const supabase = await createClient()
    
    // Get recent events from same source
    const recentEvents = await supabase
      .from('security_events')
      .select('*')
      .eq('ip_address', event.ipAddress)
      .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Last 15 minutes
      .order('created_at', { ascending: false })
    
    if (!recentEvents.data) return
    
    // Check for patterns
    const patterns = {
      bruteForce: this.detectBruteForce(recentEvents.data),
      scanning: this.detectScanning(recentEvents.data),
      exploitation: this.detectExploitation(recentEvents.data),
    }
    
    // Log detected patterns
    for (const [pattern, detected] of Object.entries(patterns)) {
      if (detected) {
        await this.logEvent({
          type: SecurityEventType.SUSPICIOUS_ACTIVITY,
          severity: SecuritySeverity.HIGH,
          ipAddress: event.ipAddress,
          metadata: {
            pattern,
            originalEvent: event.type,
            eventCount: recentEvents.data.length,
          },
        })
      }
    }
  }
  
  // Detect brute force attempts
  private static detectBruteForce(events: any[]): boolean {
    const failedLogins = events.filter(e => e.type === SecurityEventType.LOGIN_FAILED)
    return failedLogins.length >= 5 // 5 failed attempts in 15 minutes
  }
  
  // Detect scanning behavior
  private static detectScanning(events: any[]): boolean {
    const uniquePaths = new Set(events.map(e => e.path).filter(Boolean))
    const unauthorized = events.filter(e => 
      e.type === SecurityEventType.UNAUTHORIZED_ACCESS ||
      e.type === SecurityEventType.PERMISSION_DENIED
    )
    
    // Many different paths or many unauthorized attempts
    return uniquePaths.size > 20 || unauthorized.length > 10
  }
  
  // Detect exploitation attempts
  private static detectExploitation(events: any[]): boolean {
    const exploitTypes = [
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      SecurityEventType.XSS_ATTEMPT,
      SecurityEventType.CSRF_ATTEMPT,
      SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
    ]
    
    const exploitAttempts = events.filter(e => exploitTypes.includes(e.type))
    return exploitAttempts.length > 0
  }
  
  // Get security metrics
  static async getSecurityMetrics(timeRange: {
    start: Date
    end: Date
  }): Promise<{
    totalEvents: number
    eventsByType: Record<string, number>
    eventsBySeverity: Record<string, number>
    topThreats: Array<{ type: string; count: number }>
    suspiciousIPs: Array<{ ip: string; count: number }>
  }> {
    const supabase = await createClient()
    
    const { data: events } = await supabase
      .from('security_events')
      .select('*')
      .gte('created_at', timeRange.start.toISOString())
      .lte('created_at', timeRange.end.toISOString())
    
    if (!events) {
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        topThreats: [],
        suspiciousIPs: [],
      }
    }
    
    // Calculate metrics
    const eventsByType: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}
    const ipCounts: Record<string, number> = {}
    
    events.forEach(event => {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      
      // Count by severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
      
      // Count by IP
      if (event.ip_address) {
        ipCounts[event.ip_address] = (ipCounts[event.ip_address] || 0) + 1
      }
    })
    
    // Get top threats
    const threatTypes = [
      SecurityEventType.SQL_INJECTION_ATTEMPT,
      SecurityEventType.XSS_ATTEMPT,
      SecurityEventType.CSRF_ATTEMPT,
      SecurityEventType.BRUTE_FORCE_ATTEMPT,
    ]
    
    const topThreats = Object.entries(eventsByType)
      .filter(([type]) => threatTypes.includes(type as SecurityEventType))
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    // Get suspicious IPs
    const suspiciousIPs = Object.entries(ipCounts)
      .filter(([, count]) => count > 10) // More than 10 events
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      topThreats,
      suspiciousIPs,
    }
  }
}

// Security audit trail
export class SecurityAudit {
  static async logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: 'view' | 'export' | 'modify' | 'delete',
    metadata?: any
  ): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: `${resourceType}_${action}`,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: metadata || {},
        created_at: new Date(),
      })
  }
  
  static async getAuditTrail(
    filters: {
      userId?: string
      resourceType?: string
      resourceId?: string
      startDate?: Date
      endDate?: Date
    }
  ): Promise<any[]> {
    const supabase = await createClient()
    
    let query = supabase.from('audit_logs').select('*')
    
    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }
    if (filters.resourceType) {
      query = query.eq('resource_type', filters.resourceType)
    }
    if (filters.resourceId) {
      query = query.eq('resource_id', filters.resourceId)
    }
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate.toISOString())
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate.toISOString())
    }
    
    const { data } = await query.order('created_at', { ascending: false })
    
    return data || []
  }
}