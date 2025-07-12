import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export interface AuditLog {
  user_id: string
  organization_id?: string
  action: string
  resource_type: string
  resource_id?: string
  metadata?: Record<string, any>
  ip_address?: string
  user_agent?: string
  status: 'success' | 'failure'
  error_message?: string
}

// Audit event types
export const AuditEvents = {
  // Authentication
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  PASSWORD_RESET: 'auth.password_reset',
  
  // Data access
  MEETING_VIEW: 'meeting.view',
  MEETING_CREATE: 'meeting.create',
  MEETING_DELETE: 'meeting.delete',
  MEETING_EXPORT: 'meeting.export',
  
  // Integrations
  INTEGRATION_CONNECT: 'integration.connect',
  INTEGRATION_DISCONNECT: 'integration.disconnect',
  INTEGRATION_SYNC: 'integration.sync',
  
  // Settings
  SETTINGS_UPDATE: 'settings.update',
  BILLING_UPDATE: 'billing.update',
  
  // Security
  API_KEY_CREATE: 'api_key.create',
  API_KEY_DELETE: 'api_key.delete',
  PERMISSION_CHANGE: 'permission.change',
} as const

export type AuditEventType = typeof AuditEvents[keyof typeof AuditEvents]

// Singleton audit logger
class AuditLogger {
  private static instance: AuditLogger
  private queue: AuditLog[] = []
  private flushInterval: NodeJS.Timeout | null = null

  private constructor() {
    // Flush logs every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 5000)
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger()
    }
    return AuditLogger.instance
  }

  async log(log: Partial<AuditLog> & { action: string }): Promise<void> {
    // Add to queue for batch insert
    this.queue.push({
      ...log,
      user_id: log.user_id || 'system',
      status: log.status || 'success',
      created_at: new Date().toISOString()
    } as any)

    // Flush if queue is large
    if (this.queue.length >= 100) {
      await this.flush()
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return

    const logs = [...this.queue]
    this.queue = []

    try {
      const supabase = await createClient()
      
      const { error } = await supabase
        .from('audit_logs')
        .insert(logs)

      if (error) {
        console.error('Failed to write audit logs:', error)
        // Re-queue failed logs
        this.queue.unshift(...logs)
      }
    } catch (error) {
      console.error('Audit log flush error:', error)
      // Re-queue failed logs
      this.queue.unshift(...logs)
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance()

// Helper function for API routes
export async function logApiAccess(
  req: NextRequest,
  action: AuditEventType,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    // Get organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    await auditLogger.log({
      user_id: user.id,
      organization_id: member?.organization_id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
      user_agent: req.headers.get('user-agent') || undefined,
      status: 'success'
    })
  } catch (error) {
    console.error('Audit logging error:', error)
  }
}

// Middleware for automatic audit logging
export function withAuditLog(
  handler: Function,
  action: AuditEventType,
  resourceType: string
) {
  return async (req: NextRequest, ...args: any[]) => {
    const start = Date.now()
    let status: 'success' | 'failure' = 'success'
    let errorMessage: string | undefined
    let resourceId: string | undefined

    try {
      // Extract resource ID from params if available
      const params = args[0]?.params
      resourceId = params?.id

      const response = await handler(req, ...args)
      
      // Check if response indicates failure
      if (response.status >= 400) {
        status = 'failure'
        errorMessage = `HTTP ${response.status}`
      }

      return response
    } catch (error) {
      status = 'failure'
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw error
    } finally {
      // Log the action
      await logApiAccess(req, action, resourceType, resourceId, {
        duration_ms: Date.now() - start,
        status,
        error: errorMessage
      })
    }
  }
}

// Process exit handler
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    auditLogger.destroy()
  })
}