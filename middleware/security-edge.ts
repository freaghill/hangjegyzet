import { NextRequest, NextResponse } from 'next/server'

// Edge-compatible security middleware (without Redis or Node.js crypto)

// Security middleware configuration
const SECURITY_CONFIG = {
  // Paths that require strict security
  strictPaths: ['/api/admin', '/api/payments', '/api/auth'],
  
  // Public paths with relaxed security
  publicPaths: ['/api/health', '/api/webhooks'],
  
  // Paths exempt from CSRF
  csrfExemptPaths: ['/api/webhooks', '/api/v1'],
  
  // Rate limiting by path (simplified for Edge)
  rateLimits: {
    '/api/auth/login': { interval: 15 * 60 * 1000, maxRequests: 5 },
    '/api/auth/register': { interval: 60 * 60 * 1000, maxRequests: 3 },
    '/api/upload': { interval: 60 * 60 * 1000, maxRequests: 10 },
    '/api/transcribe': { interval: 60 * 60 * 1000, maxRequests: 20 },
    '/api/export': { interval: 60 * 60 * 1000, maxRequests: 5 },
    default: { interval: 60 * 1000, maxRequests: 60 },
  },
}

// In-memory rate limit store (Edge-compatible)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Main security middleware for Edge Runtime
export async function securityMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname
  
  // 1. Basic request validation
  if (!validateHeaders(request.headers)) {
    return NextResponse.json(
      { error: 'Invalid request headers' },
      { status: 400 }
    )
  }
  
  // 2. Path traversal prevention
  if (pathname.includes('..') || pathname.includes('//')) {
    return NextResponse.json(
      { error: 'Invalid path' },
      { status: 400 }
    )
  }
  
  // 3. Origin validation for API requests
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    
    if (origin && host) {
      const allowedOrigins = [
        `https://${host}`,
        `http://${host}`,
        process.env.NEXT_PUBLIC_APP_URL,
      ].filter(Boolean)
      
      if (!allowedOrigins.includes(origin)) {
        return NextResponse.json(
          { error: 'Invalid origin' },
          { status: 403 }
        )
      }
    }
  }
  
  // 4. Simple rate limiting (Edge-compatible)
  const clientId = getClientId(request)
  const rateLimitConfig = getRateLimitConfig(pathname)
  
  if (!checkRateLimit(clientId, rateLimitConfig)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { 
        status: 429,
        headers: {
          'Retry-After': '60',
        },
      }
    )
  }
  
  // 5. CSRF protection (simplified for Edge)
  if (!isCSRFExempt(pathname) && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const csrfToken = request.headers.get('x-csrf-token')
    const cookieToken = request.cookies.get('csrf-token')?.value
    
    if (!csrfToken || !cookieToken || csrfToken !== cookieToken) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }
  }
  
  // Request passed all security checks
  return null
}

// Get client ID for rate limiting
function getClientId(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'anonymous'
}

// Get rate limit configuration for path
function getRateLimitConfig(pathname: string): { interval: number; maxRequests: number } {
  for (const [path, config] of Object.entries(SECURITY_CONFIG.rateLimits)) {
    if (path !== 'default' && pathname.startsWith(path)) {
      return config
    }
  }
  
  return SECURITY_CONFIG.rateLimits.default
}

// Simple in-memory rate limiting for Edge Runtime
function checkRateLimit(
  clientId: string,
  config: { interval: number; maxRequests: number }
): boolean {
  const now = Date.now()
  const key = `${clientId}:${Math.floor(now / config.interval)}`
  
  // Clean up old entries
  for (const [k, v] of rateLimitStore.entries()) {
    if (v.resetAt < now) {
      rateLimitStore.delete(k)
    }
  }
  
  const current = rateLimitStore.get(key) || { count: 0, resetAt: now + config.interval }
  
  if (current.count >= config.maxRequests) {
    return false
  }
  
  current.count++
  rateLimitStore.set(key, current)
  
  // Limit store size to prevent memory issues
  if (rateLimitStore.size > 1000) {
    const entries = Array.from(rateLimitStore.entries())
    entries.sort((a, b) => a[1].resetAt - b[1].resetAt)
    entries.slice(0, 500).forEach(([k]) => rateLimitStore.delete(k))
  }
  
  return true
}

// Validate headers
function validateHeaders(headers: Headers): boolean {
  // Check for suspicious headers
  const suspiciousPatterns = [
    /(\b(union|select|insert|update|delete|drop)\b|;|'|"|--)/, // SQL injection
    /<script|javascript:|on\w+=/i, // XSS
  ]
  
  const headersToCheck = ['referer', 'user-agent', 'x-forwarded-for']
  
  for (const header of headersToCheck) {
    const value = headers.get(header)
    if (value) {
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(value)) {
          return false
        }
      }
    }
  }
  
  return true
}

// Check if path is CSRF exempt
function isCSRFExempt(pathname: string): boolean {
  return SECURITY_CONFIG.csrfExemptPaths.some(path => pathname.startsWith(path))
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
  
  // CSP (Content Security Policy) - simplified without nonce
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