import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/security/rate-limiter'
import { withCSRFProtection, validateOrigin } from '@/lib/security/csrf-protection'
import { withSecurityHeaders } from '@/lib/security/headers'
import { validateHeaders, sanitizePath } from '@/lib/security/input-validation'
import { getClientId } from '@/lib/security/rate-limiter'

// Security middleware configuration
const SECURITY_CONFIG = {
  // Paths that require strict security
  strictPaths: ['/api/admin', '/api/payments', '/api/auth'],
  
  // Public paths with relaxed security
  publicPaths: ['/api/health', '/api/webhooks'],
  
  // Paths exempt from CSRF
  csrfExemptPaths: ['/api/webhooks', '/api/v1'],
  
  // Rate limiting by path
  rateLimits: {
    '/api/auth/login': { interval: 15 * 60 * 1000, maxRequests: 5 },
    '/api/auth/register': { interval: 60 * 60 * 1000, maxRequests: 3 },
    '/api/upload': { interval: 60 * 60 * 1000, maxRequests: 10 },
    '/api/transcribe': { interval: 60 * 60 * 1000, maxRequests: 20 },
    '/api/export': { interval: 60 * 60 * 1000, maxRequests: 5 },
    default: { interval: 60 * 1000, maxRequests: 60 },
  },
}

// Main security middleware
export async function securityMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname
  
  // 1. Basic request validation
  const { valid, error } = validateHeaders(request.headers)
  if (!valid) {
    return NextResponse.json(
      { error: `Invalid request: ${error}` },
      { status: 400 }
    )
  }
  
  // 2. Path traversal prevention
  const sanitizedPath = sanitizePath(pathname)
  if (sanitizedPath !== pathname) {
    return NextResponse.json(
      { error: 'Invalid path' },
      { status: 400 }
    )
  }
  
  // 3. Origin validation for API requests
  if (pathname.startsWith('/api/') && !validateOrigin(request)) {
    return NextResponse.json(
      { error: 'Invalid origin' },
      { status: 403 }
    )
  }
  
  // 4. Rate limiting
  const rateLimitConfig = getRateLimitConfig(pathname)
  const clientId = getClientId(request)
  
  const rateLimitCheck = await checkRateLimit(clientId, rateLimitConfig)
  if (!rateLimitCheck.success) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        retryAfter: rateLimitCheck.retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': rateLimitCheck.retryAfter.toString(),
          'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitCheck.reset.toString(),
        },
      }
    )
  }
  
  // 5. CSRF protection (skip for exempt paths)
  if (!isCSRFExempt(pathname) && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const csrfValid = await validateCSRFToken(request)
    if (!csrfValid) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }
  }
  
  // 6. Additional strict checks for sensitive paths
  if (isStrictPath(pathname)) {
    // Require authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Check for suspicious activity
    const suspicious = await checkSuspiciousActivity(request)
    if (suspicious) {
      // Log and optionally block
      await logSecurityEvent('suspicious_activity', {
        path: pathname,
        clientId,
        headers: Object.fromEntries(request.headers.entries()),
      })
      
      // You might want to return an error here
      // return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
  
  // Request passed all security checks
  return null
}

// Get rate limit configuration for path
function getRateLimitConfig(pathname: string): { interval: number; maxRequests: number } {
  // Check specific path configs
  for (const [path, config] of Object.entries(SECURITY_CONFIG.rateLimits)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return config
    }
  }
  
  return SECURITY_CONFIG.rateLimits.default
}

// Check if path is CSRF exempt
function isCSRFExempt(pathname: string): boolean {
  return SECURITY_CONFIG.csrfExemptPaths.some(path => pathname.startsWith(path))
}

// Check if path requires strict security
function isStrictPath(pathname: string): boolean {
  return SECURITY_CONFIG.strictPaths.some(path => pathname.startsWith(path))
}

// Check for suspicious activity patterns
async function checkSuspiciousActivity(request: NextRequest): Promise<boolean> {
  const indicators = []
  
  // Check for SQL injection attempts in query params
  const queryString = request.nextUrl.search
  if (queryString && /(\b(union|select|insert|update|delete|drop)\b|;|'|"|--)/.test(queryString.toLowerCase())) {
    indicators.push('sql_injection_attempt')
  }
  
  // Check for XSS attempts in headers
  const suspiciousHeaders = ['referer', 'user-agent', 'x-forwarded-for']
  for (const header of suspiciousHeaders) {
    const value = request.headers.get(header)
    if (value && /<script|javascript:|on\w+=/i.test(value)) {
      indicators.push('xss_attempt')
    }
  }
  
  // Check for path traversal in URL
  if (request.nextUrl.pathname.includes('..') || request.nextUrl.pathname.includes('//')) {
    indicators.push('path_traversal_attempt')
  }
  
  // Check for abnormal request size
  const contentLength = request.headers.get('content-length')
  if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB
    indicators.push('abnormal_request_size')
  }
  
  return indicators.length > 0
}

// Log security events
async function logSecurityEvent(
  eventType: string,
  details: any
): Promise<void> {
  // In production, this should write to a security log
  console.warn(`[SECURITY] ${eventType}:`, details)
  
  // You can also send to external security monitoring service
  if (process.env.SECURITY_WEBHOOK_URL) {
    try {
      await fetch(process.env.SECURITY_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: eventType,
          details,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
        }),
      })
    } catch (error) {
      console.error('Failed to send security event:', error)
    }
  }
}

// Apply security headers to response
export function applySecurityHeaders(response: NextResponse): NextResponse {
  // Basic security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // HSTS
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
  
  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=(), payment=(self)'
  )
  
  // CSP (Content Security Policy)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
    "frame-src 'self' https://checkout.stripe.com https://secure.barion.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  return response
}

// Rate limit check with Redis
import { getRedisClient } from '@/lib/cache/redis-client'

async function checkRateLimit(
  key: string,
  config: { interval: number; maxRequests: number }
): Promise<{
  success: boolean
  remaining: number
  reset: number
  retryAfter: number
}> {
  const redis = getRedisClient()
  
  if (!redis) {
    // Fallback to in-memory rate limiting
    return { success: true, remaining: 999, reset: 0, retryAfter: 0 }
  }
  
  const now = Date.now()
  const window = Math.floor(now / config.interval)
  const redisKey = `rate_limit:${key}:${window}`
  
  try {
    const count = await redis.incr(redisKey)
    
    if (count === 1) {
      await redis.expire(redisKey, Math.ceil(config.interval / 1000))
    }
    
    const remaining = Math.max(0, config.maxRequests - count)
    const reset = (window + 1) * config.interval
    
    return {
      success: count <= config.maxRequests,
      remaining,
      reset,
      retryAfter: Math.ceil((reset - now) / 1000),
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    return { success: true, remaining: 999, reset: 0, retryAfter: 0 }
  }
}

// CSRF token validation
async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  const token = request.headers.get('x-csrf-token') || 
                request.headers.get('csrf-token')
  
  if (!token) return false
  
  // Get session token from cookie
  const sessionToken = request.cookies.get('csrf-token')?.value
  
  if (!sessionToken) return false
  
  // Constant-time comparison
  return token.length === sessionToken.length &&
         crypto.timingSafeEqual(
           Buffer.from(token),
           Buffer.from(sessionToken)
         )
}