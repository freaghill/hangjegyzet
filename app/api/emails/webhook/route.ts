import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/lib/email/email-service'

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from headers
    const signature = request.headers.get('x-twilio-email-event-webhook-signature') || ''
    
    // Get raw body
    const body = await request.json()

    // Process webhook
    const emailService = new EmailService()
    await emailService.processWebhook(body, signature)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process webhook' },
      { status: 500 }
    )
  }
}