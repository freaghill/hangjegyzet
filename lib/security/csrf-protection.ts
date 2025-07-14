import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { cookies } from 'next/headers'

// CSRF token configuration
const CSRF_TOKEN_LENGTH = 32
const CSRF_COOKIE_NAME = '__Host-csrf-token'
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_TOKEN_MAX_AGE = 24 * 60 * 60 // 24 hours

// Generate secure CSRF token
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
}

// Hash token for double-submit cookie pattern
export function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex')
}

// Get or create CSRF token
export async function getCSRFToken(): Promise<string> {
  const cookieStore = cookies()
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)
  
  if (existingToken?.value) {
    return existingToken.value
  }
  
  // Generate new token
  const token = generateCSRFToken()
  
  // Set secure cookie
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_MAX_AGE,
    path: '/',
  })
  
  return token
}

// Validate CSRF token
export async function validateCSRFToken(req: NextRequest): Promise<boolean> {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return true
  }
  
  // Skip for API routes with valid API key
  const apiKey = req.headers.get('x-api-key')
  if (apiKey && await validateAPIKey(apiKey)) {
    return true
  }
  
  // Get token from cookie
  const cookieStore = cookies()
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value
  
  if (!cookieToken) {
    return false
  }
  
  // Get token from request (header or body)
  let requestToken = req.headers.get(CSRF_HEADER_NAME)
  
  // Try to get from body if not in header
  if (!requestToken && req.headers.get('content-type')?.includes('application/json')) {
    try {
      const body = await req.clone().json()
      requestToken = body._csrf || body.csrfToken
    } catch {
      // Invalid JSON
    }
  }
  
  if (!requestToken) {
    return false
  }
  
  // Compare tokens (constant time comparison)
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(requestToken)
  )
}

// CSRF middleware
export function withCSRFProtection(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Validate CSRF token
    const isValid = await validateCSRFToken(req)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }
    
    // Execute handler
    const response = await handler(req)
    
    // Ensure CSRF token is set
    if (['GET', 'HEAD'].includes(req.method)) {
      const token = await getCSRFToken()
      response.headers.set('X-CSRF-Token', token)
    }
    
    return response
  }
}

// API key validation (for machine-to-machine communication)
async function validateAPIKey(apiKey: string): Promise<boolean> {
  // Hash the API key
  const hashedKey = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex')
  
  // Check against stored API keys
  // In production, this should query the database
  const validKeys = process.env.VALID_API_KEYS?.split(',') || []
  
  return validKeys.some(key => {
    const hashedValidKey = crypto
      .createHash('sha256')
      .update(key)
      .digest('hex')
    
    return crypto.timingSafeEqual(
      Buffer.from(hashedKey),
      Buffer.from(hashedValidKey)
    )
  })
}

// Double-submit cookie pattern for SPAs
export function generateDoubleSubmitToken(): { token: string; hash: string } {
  const token = generateCSRFToken()
  const hash = hashToken(token)
  
  return { token, hash }
}

// Validate double-submit pattern
export function validateDoubleSubmitToken(token: string, hash: string): boolean {
  const expectedHash = hashToken(token)
  
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expectedHash)
  )
}

// CSRF token rotation
export async function rotateCSRFToken(): Promise<string> {
  const cookieStore = cookies()
  const newToken = generateCSRFToken()
  
  cookieStore.set(CSRF_COOKIE_NAME, newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_MAX_AGE,
    path: '/',
  })
  
  return newToken
}

// Origin validation
export function validateOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  
  // No origin/referer for same-origin requests
  if (!origin && !referer) {
    return true
  }
  
  // Get allowed origins
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'https://dev.vexum.hu',
  ].filter(Boolean)
  
  // Check origin
  if (origin && !allowedOrigins.includes(origin)) {
    return false
  }
  
  // Check referer
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`
      
      if (!allowedOrigins.includes(refererOrigin)) {
        return false
      }
    } catch {
      return false
    }
  }
  
  return true
}

// Combined security middleware
export function withSecurityHeaders(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Validate origin
    if (!validateOrigin(req)) {
      return NextResponse.json(
        { error: 'Invalid origin' },
        { status: 403 }
      )
    }
    
    // Execute handler
    const response = await handler(req)
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    return response
  }
}

// Client-side CSRF token provider
export const CSRFTokenProvider = `
  // Auto-inject CSRF token into all requests
  if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    
    window.fetch = async function(...args) {
      let [resource, config] = args;
      
      // Get CSRF token from meta tag or cookie
      const token = document.querySelector('meta[name="csrf-token"]')?.content ||
                    document.cookie.match(/__Host-csrf-token=([^;]+)/)?.[1];
      
      if (token && config?.method && !['GET', 'HEAD'].includes(config.method)) {
        config.headers = {
          ...config.headers,
          'X-CSRF-Token': token
        };
      }
      
      return originalFetch.apply(this, args);
    };
  }
`