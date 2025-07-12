import { NextResponse } from 'next/server'

// Liveness probe - checks if the app is running
export async function GET() {
  return NextResponse.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.APP_VERSION || '1.0.0',
  })
}