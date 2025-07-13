import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { rateLimiters } from './rate-limiter'
import { hashSensitiveData, verifyHashedData } from './encryption'

// Password policy
export const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommon: true,
  preventReuse: 5, // Prevent reusing last 5 passwords
  maxAge: 90, // Days before password expires
  minAge: 1, // Days before password can be changed again
}

// Session configuration
export const SESSION_CONFIG = {
  absoluteTimeout: 24 * 60 * 60 * 1000, // 24 hours
  idleTimeout: 30 * 60 * 1000, // 30 minutes
  renewalThreshold: 5 * 60 * 1000, // Renew if less than 5 minutes left
  maxConcurrentSessions: 5,
}

// Common weak passwords to prevent
const COMMON_PASSWORDS = new Set([
  'password123', 'admin123', 'qwerty123', '12345678', 'password',
  'letmein', 'welcome123', 'admin', 'root', 'toor', 'pass',
  // Add more from a comprehensive list
])

// Password validation
export function validatePassword(password: string, userInfo?: {
  email?: string
  name?: string
}): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Length check
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters`)
  }
  
  // Character requirements
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  // Common password check
  if (PASSWORD_POLICY.preventCommon && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Password is too common')
  }
  
  // Check if password contains user info
  if (userInfo) {
    const lowerPassword = password.toLowerCase()
    
    if (userInfo.email && lowerPassword.includes(userInfo.email.split('@')[0].toLowerCase())) {
      errors.push('Password should not contain your email')
    }
    
    if (userInfo.name) {
      const nameParts = userInfo.name.toLowerCase().split(/\s+/)
      if (nameParts.some(part => part.length > 2 && lowerPassword.includes(part))) {
        errors.push('Password should not contain your name')
      }
    }
  }
  
  // Entropy check (simplified)
  const uniqueChars = new Set(password).size
  if (uniqueChars < password.length * 0.6) {
    errors.push('Password has too many repeated characters')
  }
  
  return { valid: errors.length === 0, errors }
}

// Multi-factor authentication
export class MFAService {
  // Generate TOTP secret
  static generateSecret(): string {
    return crypto.randomBytes(32).toString('base64')
  }
  
  // Generate TOTP code
  static generateTOTP(secret: string, window: number = 0): string {
    const time = Math.floor(Date.now() / 1000 / 30) + window
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base64'))
    
    const timeBuffer = Buffer.alloc(8)
    timeBuffer.writeBigInt64BE(BigInt(time))
    
    hmac.update(timeBuffer)
    const hash = hmac.digest()
    
    const offset = hash[hash.length - 1] & 0xf
    const code = (hash.readUInt32BE(offset) & 0x7fffffff) % 1000000
    
    return code.toString().padStart(6, '0')
  }
  
  // Verify TOTP code
  static verifyTOTP(token: string, secret: string, window: number = 1): boolean {
    // Check current and adjacent windows for clock skew
    for (let i = -window; i <= window; i++) {
      if (this.generateTOTP(secret, i) === token) {
        return true
      }
    }
    return false
  }
  
  // Generate backup codes
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = []
    
    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase()
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
    }
    
    return codes
  }
}

// Session security
export class SessionSecurity {
  // Generate secure session ID
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex')
  }
  
  // Create session fingerprint
  static createFingerprint(req: NextRequest): string {
    const components = [
      req.headers.get('user-agent') || '',
      req.headers.get('accept-language') || '',
      req.headers.get('accept-encoding') || '',
      // Add more stable browser characteristics
    ]
    
    return crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex')
  }
  
  // Validate session
  static async validateSession(
    sessionId: string,
    fingerprint: string
  ): Promise<boolean> {
    const supabase = await createClient()
    
    const { data: session } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()
    
    if (!session) return false
    
    // Check fingerprint
    if (session.fingerprint !== fingerprint) {
      // Log potential session hijacking
      await this.logSecurityEvent('session_hijack_attempt', {
        sessionId,
        expectedFingerprint: session.fingerprint,
        receivedFingerprint: fingerprint,
      })
      return false
    }
    
    // Check expiration
    const now = Date.now()
    const createdAt = new Date(session.created_at).getTime()
    const lastActivity = new Date(session.last_activity).getTime()
    
    if (now - createdAt > SESSION_CONFIG.absoluteTimeout) {
      return false
    }
    
    if (now - lastActivity > SESSION_CONFIG.idleTimeout) {
      return false
    }
    
    // Update last activity
    await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('id', sessionId)
    
    return true
  }
  
  // Log security event
  static async logSecurityEvent(
    eventType: string,
    details: any
  ): Promise<void> {
    const supabase = await createClient()
    
    await supabase
      .from('security_logs')
      .insert({
        event_type: eventType,
        details,
        timestamp: new Date().toISOString(),
      })
  }
}

// Account security features
export class AccountSecurity {
  // Check for compromised passwords
  static async isPasswordCompromised(password: string): Promise<boolean> {
    // Use k-anonymity with Have I Been Pwned API
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase()
    const prefix = sha1.slice(0, 5)
    const suffix = sha1.slice(5)
    
    try {
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
      const text = await response.text()
      
      // Check if suffix appears in response
      const lines = text.split('\n')
      for (const line of lines) {
        const [hashSuffix, count] = line.split(':')
        if (hashSuffix === suffix) {
          return true
        }
      }
      
      return false
    } catch {
      // Fail open - don't block if service is unavailable
      return false
    }
  }
  
  // Account lockout after failed attempts
  static async checkAccountLockout(
    identifier: string,
    maxAttempts: number = 5,
    lockoutDuration: number = 30 * 60 * 1000 // 30 minutes
  ): Promise<{ locked: boolean; remainingTime?: number }> {
    const key = `lockout:${identifier}`
    const { success, reset } = await rateLimiters.public.limit(key)
    
    if (!success) {
      const remainingTime = reset - Date.now()
      return { locked: true, remainingTime }
    }
    
    return { locked: false }
  }
  
  // Suspicious activity detection
  static async detectSuspiciousActivity(
    userId: string,
    activity: {
      type: string
      ipAddress: string
      userAgent: string
      location?: string
    }
  ): Promise<boolean> {
    const supabase = await createClient()
    
    // Get user's recent activity
    const { data: recentActivity } = await supabase
      .from('user_activities')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
    
    if (!recentActivity || recentActivity.length === 0) {
      return false
    }
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      // Multiple login attempts from different locations
      this.checkLocationAnomaly(recentActivity, activity.location),
      
      // Unusual time patterns
      this.checkTimeAnomaly(recentActivity),
      
      // Device fingerprint changes
      this.checkDeviceAnomaly(recentActivity, activity.userAgent),
      
      // Rapid activity changes
      this.checkVelocityAnomaly(recentActivity),
    ]
    
    return suspiciousPatterns.some(pattern => pattern)
  }
  
  private static checkLocationAnomaly(
    activities: any[],
    currentLocation?: string
  ): boolean {
    if (!currentLocation) return false
    
    const recentLocations = new Set(
      activities.map(a => a.location).filter(Boolean)
    )
    
    // If more than 3 different locations in 24 hours
    return recentLocations.size > 3 && !recentLocations.has(currentLocation)
  }
  
  private static checkTimeAnomaly(activities: any[]): boolean {
    const hours = activities.map(a => new Date(a.created_at).getHours())
    const uniqueHours = new Set(hours)
    
    // If activity across more than 18 hours in a day (possible but unusual)
    return uniqueHours.size > 18
  }
  
  private static checkDeviceAnomaly(
    activities: any[],
    currentUserAgent: string
  ): boolean {
    const userAgents = new Set(activities.map(a => a.user_agent))
    
    // If more than 5 different devices in 24 hours
    return userAgents.size > 5 && !userAgents.has(currentUserAgent)
  }
  
  private static checkVelocityAnomaly(activities: any[]): boolean {
    if (activities.length < 2) return false
    
    // Check for impossible travel (e.g., login from different countries within minutes)
    // This would require geocoding IP addresses
    // Simplified: check for too many activities in short time
    
    const recentCount = activities.filter(a => {
      const age = Date.now() - new Date(a.created_at).getTime()
      return age < 5 * 60 * 1000 // Last 5 minutes
    }).length
    
    return recentCount > 10 // More than 10 activities in 5 minutes
  }
}

// Password history to prevent reuse
export async function checkPasswordHistory(
  userId: string,
  newPasswordHash: string
): Promise<boolean> {
  const supabase = await createClient()
  
  const { data: history } = await supabase
    .from('password_history')
    .select('password_hash')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(PASSWORD_POLICY.preventReuse)
  
  if (!history) return true
  
  // Check if new password matches any recent passwords
  for (const entry of history) {
    if (entry.password_hash === newPasswordHash) {
      return false
    }
  }
  
  return true
}

// Secure password reset
export class PasswordReset {
  static async initiateReset(email: string): Promise<string> {
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex')
    const hashedToken = hashSensitiveData(token)
    
    const supabase = await createClient()
    
    // Store reset token with expiration
    await supabase
      .from('password_resets')
      .insert({
        email,
        token: hashedToken,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
        ip_address: '', // Should be filled from request
      })
    
    return token
  }
  
  static async validateResetToken(
    token: string,
    email: string
  ): Promise<boolean> {
    const supabase = await createClient()
    
    const { data: reset } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', email)
      .eq('used', false)
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (!reset) return false
    
    // Verify token
    return verifyHashedData(token, reset.token)
  }
}