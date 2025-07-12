import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export const runtime = 'nodejs'

// This endpoint returns WebSocket connection details
// The actual WebSocket server is initialized in middleware
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }
    
    // Generate WebSocket connection URL
    const protocol = process.env.NODE_ENV === 'production' ? 'wss' : 'ws'
    const host = request.headers.get('host') || 'localhost:4000'
    const wsUrl = `${protocol}://${host}/ws`
    
    // Get auth token for WebSocket connection
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 401 }
      )
    }
    
    return NextResponse.json({
      wsUrl,
      token: session.access_token,
      userId: user.id,
      organizationId: profile.organization_id,
      role: profile.role,
      reconnectInterval: 1000, // 1 second
      maxReconnectAttempts: 5,
      pingInterval: 25000, // 25 seconds
      pongTimeout: 60000, // 60 seconds
    })
  } catch (error) {
    console.error('WebSocket connection error:', error)
    return NextResponse.json(
      { error: 'Failed to establish WebSocket connection' },
      { status: 500 }
    )
  }
}

// WebSocket upgrade is handled in middleware.ts
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'WebSocket connections must be established via GET request with upgrade headers' },
    { status: 400 }
  )
}