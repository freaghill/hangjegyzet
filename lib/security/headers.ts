import { NextRequest, NextResponse } from 'next/server'

// Content Security Policy configuration
export function getCSP(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  
  const directives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      isDev && "'unsafe-eval'", // Required for Next.js dev
      'https://cdn.jsdelivr.net',
      'https://www.googletagmanager.com',
      'https://www.google-analytics.com',
    ].filter(Boolean),
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.supabase.co',
      'https://avatars.githubusercontent.com',
      'https://lh3.googleusercontent.com',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
    ],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://api.stripe.com',
      'https://checkout.stripe.com',
      'https://api.barion.com',
      isDev && 'ws://localhost:*',
    ].filter(Boolean),
    'media-src': [
      "'self'",
      'blob:',
      'https://*.supabase.co',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': [
      "'self'",
      'https://checkout.stripe.com',
      'https://secure.barion.com',
    ],
    'frame-ancestors': ["'none'"],
    'frame-src': [
      "'self'",
      'https://checkout.stripe.com',
      'https://secure.barion.com',
    ],
    'upgrade-insecure-requests': !isDev ? [''] : undefined,
    'block-all-mixed-content': !isDev ? [''] : undefined,
  }
  
  return Object.entries(directives)
    .filter(([, values]) => values !== undefined)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ')
}

// Generate nonce for CSP
export function generateNonce(): string {
  // Edge-compatible nonce generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return btoa(crypto.randomUUID())
  }
  // Fallback for Edge Runtime
  return btoa(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15))
}

// Security headers configuration
export const securityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS filter
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy (formerly Feature Policy)
  'Permissions-Policy': [
    'camera=()',
    'microphone=(self)', // Allow for transcription
    'geolocation=()',
    'payment=(self)', // Allow for payment processing
    'usb=()',
    'accelerometer=()',
    'gyroscope=()',
    'magnetometer=()',
    'fullscreen=(self)',
  ].join(', '),
  
  // HSTS (HTTP Strict Transport Security)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Prevent DNS prefetching
  'X-DNS-Prefetch-Control': 'on',
  
  // Download options
  'X-Download-Options': 'noopen',
  
  // Permitted cross-domain policies
  'X-Permitted-Cross-Domain-Policies': 'none',
}

// Apply security headers middleware
export function withSecurityHeaders(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Generate nonce for this request
    const nonce = generateNonce()
    
    // Store nonce in request for use in components
    (req as any).nonce = nonce
    
    // Execute handler
    const response = await handler(req)
    
    // Apply security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    // Set CSP with nonce
    const csp = getCSP(nonce)
    response.headers.set('Content-Security-Policy', csp)
    
    // Report-Only CSP for testing
    if (process.env.CSP_REPORT_ONLY === 'true') {
      response.headers.set('Content-Security-Policy-Report-Only', csp)
      response.headers.delete('Content-Security-Policy')
    }
    
    return response
  }
}

// CORS configuration
export function configureCORS(
  response: NextResponse,
  options?: {
    origin?: string | string[] | ((origin: string) => boolean)
    credentials?: boolean
    methods?: string[]
    allowedHeaders?: string[]
    exposedHeaders?: string[]
    maxAge?: number
  }
) {
  const {
    origin = process.env.NEXT_PUBLIC_APP_URL || '*',
    credentials = true,
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-API-Key'],
    exposedHeaders = ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge = 86400, // 24 hours
  } = options || {}
  
  // Handle origin
  if (typeof origin === 'string') {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else if (Array.isArray(origin)) {
    // Check if request origin is in allowed list
    const requestOrigin = response.headers.get('origin')
    if (requestOrigin && origin.includes(requestOrigin)) {
      response.headers.set('Access-Control-Allow-Origin', requestOrigin)
    }
  }
  
  // Set other CORS headers
  if (credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  
  response.headers.set('Access-Control-Allow-Methods', methods.join(', '))
  response.headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '))
  response.headers.set('Access-Control-Expose-Headers', exposedHeaders.join(', '))
  response.headers.set('Access-Control-Max-Age', maxAge.toString())
  
  return response
}

// Security headers for API routes
export function apiSecurityHeaders(response: NextResponse): NextResponse {
  // Basic security headers for API
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  return response
}

// Subresource Integrity (SRI) hash generator
export async function generateSRIHash(content: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-384', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashBase64 = btoa(String.fromCharCode(...hashArray))
  
  return `sha384-${hashBase64}`
}

// Security headers for file downloads
export function downloadSecurityHeaders(
  response: NextResponse,
  filename: string,
  contentType: string = 'application/octet-stream'
): NextResponse {
  // Sanitize filename
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  response.headers.set('Content-Type', contentType)
  response.headers.set('Content-Disposition', `attachment; filename="${sanitizedFilename}"`)
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  
  return response
}