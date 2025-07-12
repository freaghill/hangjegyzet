import { NextResponse } from 'next/server'

export async function GET() {
  // Mock session for testing
  // In production, this would return the actual Supabase session
  return NextResponse.json({
    user: {
      id: 'test-user-id',
      email: 'test@example.com'
    },
    access_token: 'test-access-token'
  })
}