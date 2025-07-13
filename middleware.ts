import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { securityMiddleware, applySecurityHeaders } from './middleware/security'
import { generateNonce } from '@/lib/security/headers'

export async function middleware(request: NextRequest) {
  // Apply security checks first
  const securityResponse = await securityMiddleware(request)
  if (securityResponse) {
    return securityResponse
  }

  let supabaseResponse = NextResponse.next({
    request,
  })
  
  // Apply comprehensive security headers
  supabaseResponse = applySecurityHeaders(supabaseResponse)
  
  // Generate and set CSP nonce
  const nonce = generateNonce()
  supabaseResponse.headers.set('X-Nonce', nonce)
  
  // Cache control for static assets
  if (request.nextUrl.pathname.startsWith('/_next/static/')) {
    supabaseResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
  
  // Enable compression hints
  supabaseResponse.headers.set('Accept-Encoding', 'gzip, deflate, br')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protected routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  // Admin routes protection
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    
    // Check if user is admin (this is a basic check, actual admin verification happens in the admin layout)
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').filter(Boolean)
    if (!adminEmails.includes(user.email || '')) {
      // For non-whitelisted users, the actual role check will happen server-side
      // This is just a basic client-side protection
    }
  }

  // Auth routes (login, register) - redirect to dashboard if already logged in
  if (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register')) {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  // Root path - redirect based on auth status
  if (request.nextUrl.pathname === '/') {
    if (user) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}