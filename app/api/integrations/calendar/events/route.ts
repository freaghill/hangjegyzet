import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  // Return empty events until Google Calendar integration is configured
  return NextResponse.json({ events: [] })
}

export async function POST(_request: NextRequest) {
  // Return error until Google Calendar integration is configured
  return NextResponse.json({ error: 'Calendar integration not configured' }, { status: 501 })
}

export async function PATCH(_request: NextRequest) {
  // Return error until Google Calendar integration is configured
  return NextResponse.json({ error: 'Calendar integration not configured' }, { status: 501 })
}