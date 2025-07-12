import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const channelId = headersList.get('x-goog-channel-id')
    const resourceState = headersList.get('x-goog-resource-state')
    const resourceId = headersList.get('x-goog-resource-id')

    // Google sends a sync message when setting up the webhook
    if (resourceState === 'sync') {
      return NextResponse.json({ success: true })
    }

    // Handle file changes
    if (resourceState === 'update' || resourceState === 'add') {
      // In a production app, you would:
      // 1. Look up the integration by channel ID
      // 2. Trigger a sync for the specific folder
      // 3. Process only new/changed files
      
      console.log('Google Drive webhook received:', {
        channelId,
        resourceState,
        resourceId,
      })

      // For now, we'll just acknowledge the webhook
      // Real implementation would queue a sync job
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

// Google requires GET for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({ status: 'ok' })
}