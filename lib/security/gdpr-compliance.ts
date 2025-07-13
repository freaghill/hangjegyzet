import { z } from 'zod'
import { encryptObject, decryptObject, maskPII } from './encryption'
import { createClient } from '@/lib/supabase/server'

// GDPR consent types
export enum ConsentType {
  NECESSARY = 'necessary',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  PERSONALIZATION = 'personalization',
}

// User consent schema
export const userConsentSchema = z.object({
  userId: z.string().uuid(),
  consents: z.object({
    necessary: z.boolean().default(true), // Always true
    analytics: z.boolean().default(false),
    marketing: z.boolean().default(false),
    personalization: z.boolean().default(false),
  }),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.date().default(() => new Date()),
  version: z.string().default('1.0'),
})

export type UserConsent = z.infer<typeof userConsentSchema>

// Data retention periods (in days)
export const DATA_RETENTION_PERIODS = {
  user_data: 365 * 2, // 2 years
  meeting_data: 365, // 1 year
  analytics_data: 90, // 3 months
  log_data: 30, // 1 month
  audit_logs: 365 * 7, // 7 years (legal requirement)
}

// GDPR compliance service
export class GDPRComplianceService {
  // Record user consent
  async recordConsent(consent: UserConsent): Promise<void> {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('user_consents')
      .insert({
        user_id: consent.userId,
        consents: consent.consents,
        ip_address: maskPII(consent.ipAddress || '', 'custom'),
        user_agent: consent.userAgent,
        version: consent.version,
        created_at: consent.timestamp,
      })
    
    if (error) {
      console.error('Failed to record consent:', error)
      throw new Error('Failed to record consent')
    }
  }
  
  // Get user consent
  async getUserConsent(userId: string): Promise<UserConsent | null> {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return {
      userId: data.user_id,
      consents: data.consents,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      timestamp: new Date(data.created_at),
      version: data.version,
    }
  }
  
  // Update consent
  async updateConsent(
    userId: string,
    consents: Partial<UserConsent['consents']>
  ): Promise<void> {
    const currentConsent = await this.getUserConsent(userId)
    
    const newConsent: UserConsent = {
      userId,
      consents: {
        necessary: true,
        analytics: consents.analytics ?? currentConsent?.consents.analytics ?? false,
        marketing: consents.marketing ?? currentConsent?.consents.marketing ?? false,
        personalization: consents.personalization ?? currentConsent?.consents.personalization ?? false,
      },
      timestamp: new Date(),
      version: '1.0',
    }
    
    await this.recordConsent(newConsent)
  }
  
  // Export user data (GDPR Article 20 - Data Portability)
  async exportUserData(userId: string): Promise<object> {
    const supabase = await createClient()
    
    // Collect all user data
    const [
      userData,
      meetings,
      annotations,
      teams,
      consents,
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('meetings').select('*').eq('user_id', userId),
      supabase.from('annotations').select('*').eq('user_id', userId),
      supabase.from('team_members').select('*, teams(*)').eq('user_id', userId),
      supabase.from('user_consents').select('*').eq('user_id', userId),
    ])
    
    // Structure exported data
    const exportData = {
      exportDate: new Date().toISOString(),
      userData: userData.data,
      meetings: meetings.data || [],
      annotations: annotations.data || [],
      teams: teams.data || [],
      consents: consents.data || [],
    }
    
    // Encrypt sensitive data
    return encryptObject(exportData)
  }
  
  // Delete user data (GDPR Article 17 - Right to Erasure)
  async deleteUserData(userId: string, options?: {
    keepAnonymized?: boolean
    reason?: string
  }): Promise<void> {
    const supabase = await createClient()
    
    if (options?.keepAnonymized) {
      // Anonymize data instead of deleting
      await this.anonymizeUserData(userId)
    } else {
      // Hard delete all user data
      const tables = [
        'annotations',
        'highlights',
        'meeting_shares',
        'meetings',
        'team_members',
        'user_consents',
        'user_preferences',
      ]
      
      for (const table of tables) {
        await supabase
          .from(table)
          .delete()
          .eq('user_id', userId)
      }
      
      // Finally delete user
      await supabase.auth.admin.deleteUser(userId)
    }
    
    // Log deletion for audit
    await this.logDataDeletion(userId, options?.reason || 'User request')
  }
  
  // Anonymize user data
  async anonymizeUserData(userId: string): Promise<void> {
    const supabase = await createClient()
    const anonymousId = `ANON_${Date.now()}`
    
    // Update user profile
    await supabase
      .from('users')
      .update({
        email: `${anonymousId}@anonymous.local`,
        full_name: 'Anonymous User',
        avatar_url: null,
        phone: null,
        metadata: {},
      })
      .eq('id', userId)
    
    // Anonymize meetings
    await supabase
      .from('meetings')
      .update({
        title: 'Anonymous Meeting',
        metadata: {},
      })
      .eq('user_id', userId)
    
    // Remove identifiable information from transcripts
    const { data: meetings } = await supabase
      .from('meetings')
      .select('id, transcript')
      .eq('user_id', userId)
    
    if (meetings) {
      for (const meeting of meetings) {
        if (meeting.transcript) {
          // Replace names and emails in transcript
          const anonymizedTranscript = this.anonymizeText(meeting.transcript)
          
          await supabase
            .from('meetings')
            .update({ transcript: anonymizedTranscript })
            .eq('id', meeting.id)
        }
      }
    }
  }
  
  // Anonymize text content
  private anonymizeText(text: string): string {
    // Replace email addresses
    text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    
    // Replace phone numbers
    text = text.replace(/\b\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g, '[PHONE]')
    
    // Replace URLs
    text = text.replace(/https?:\/\/[^\s]+/g, '[URL]')
    
    // Replace potential names (capitalized words)
    // This is a simple heuristic and may need refinement
    text = text.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]')
    
    return text
  }
  
  // Log data deletion for audit
  private async logDataDeletion(userId: string, reason: string): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('audit_logs')
      .insert({
        action: 'user_data_deletion',
        user_id: userId,
        metadata: {
          reason,
          timestamp: new Date().toISOString(),
          gdpr_request: true,
        },
      })
  }
  
  // Data retention cleanup
  async cleanupExpiredData(): Promise<void> {
    const supabase = await createClient()
    const now = new Date()
    
    // Clean up old meetings
    const meetingCutoff = new Date(now.getTime() - DATA_RETENTION_PERIODS.meeting_data * 24 * 60 * 60 * 1000)
    await supabase
      .from('meetings')
      .delete()
      .lt('created_at', meetingCutoff.toISOString())
      .eq('archived', true)
    
    // Clean up old analytics
    const analyticsCutoff = new Date(now.getTime() - DATA_RETENTION_PERIODS.analytics_data * 24 * 60 * 60 * 1000)
    await supabase
      .from('analytics_events')
      .delete()
      .lt('created_at', analyticsCutoff.toISOString())
    
    // Clean up old logs
    const logCutoff = new Date(now.getTime() - DATA_RETENTION_PERIODS.log_data * 24 * 60 * 60 * 1000)
    await supabase
      .from('system_logs')
      .delete()
      .lt('created_at', logCutoff.toISOString())
      .neq('level', 'audit') // Keep audit logs
  }
  
  // Get data processing purposes
  getDataProcessingPurposes(): Record<string, string> {
    return {
      necessary: 'Core functionality, authentication, and service delivery',
      analytics: 'Usage analytics to improve our service',
      marketing: 'Marketing communications and promotional offers',
      personalization: 'Personalized content and recommendations',
    }
  }
  
  // Check if user can access feature based on consent
  canAccessFeature(
    consent: UserConsent | null,
    requiredConsent: ConsentType
  ): boolean {
    if (!consent) return false
    if (requiredConsent === ConsentType.NECESSARY) return true
    
    return consent.consents[requiredConsent] === true
  }
}

// GDPR cookie banner configuration
export const GDPR_COOKIE_CONFIG = {
  necessary: {
    name: 'Necessary Cookies',
    description: 'Essential for the website to function properly',
    required: true,
    cookies: ['session', 'csrf', 'auth'],
  },
  analytics: {
    name: 'Analytics Cookies',
    description: 'Help us understand how you use our website',
    required: false,
    cookies: ['_ga', '_gid', 'analytics_id'],
  },
  marketing: {
    name: 'Marketing Cookies',
    description: 'Used to track visitors across websites',
    required: false,
    cookies: ['_fbp', 'marketing_id'],
  },
  personalization: {
    name: 'Personalization Cookies',
    description: 'Remember your preferences and settings',
    required: false,
    cookies: ['theme', 'language', 'preferences'],
  },
}

// Privacy policy version tracking
export const PRIVACY_POLICY_VERSION = '2.0'
export const TERMS_OF_SERVICE_VERSION = '2.0'

// GDPR request types
export enum GDPRRequestType {
  ACCESS = 'access', // Article 15
  RECTIFICATION = 'rectification', // Article 16
  ERASURE = 'erasure', // Article 17
  PORTABILITY = 'portability', // Article 20
  RESTRICTION = 'restriction', // Article 18
  OBJECTION = 'objection', // Article 21
}

// GDPR request handler
export async function handleGDPRRequest(
  userId: string,
  requestType: GDPRRequestType,
  details?: any
): Promise<any> {
  const gdprService = new GDPRComplianceService()
  
  switch (requestType) {
    case GDPRRequestType.ACCESS:
    case GDPRRequestType.PORTABILITY:
      return await gdprService.exportUserData(userId)
      
    case GDPRRequestType.ERASURE:
      return await gdprService.deleteUserData(userId, details)
      
    case GDPRRequestType.RECTIFICATION:
      // Handle data correction requests
      // Implementation depends on specific requirements
      break
      
    case GDPRRequestType.RESTRICTION:
      // Handle processing restriction requests
      // Implementation depends on specific requirements
      break
      
    case GDPRRequestType.OBJECTION:
      // Handle objection to processing
      // Update consent accordingly
      break
  }
}