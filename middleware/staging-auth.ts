import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function stagingAuth(request: NextRequest) {
  // Only apply to staging environment
  if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.next()
  }

  // Check for staging password
  const stagingPassword = process.env.STAGING_PASSWORD
  if (!stagingPassword) {
    return NextResponse.next()
  }

  // Check basic auth
  const basicAuth = request.headers.get('authorization')
  
  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')
    
    if (pwd === stagingPassword) {
      return NextResponse.next()
    }
  }

  // Request authentication
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Staging"'
    }
  })
}