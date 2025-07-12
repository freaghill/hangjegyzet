import { NextRequest, NextResponse } from 'next/server'
import { simplePay } from '@/lib/payments/simplepay'
import { SubscriptionManager } from '@/lib/payments/subscription'

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('signature')
    
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    const body = await request.json()
    
    // Verify IPN signature
    const isValid = simplePay.verifyIPN(body, signature)
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // Process IPN notification
    if (body.status === 'FINISHED' && body.result === 'SUCCESS') {
      // Payment was successful
      const subscriptionManager = new SubscriptionManager()
      await subscriptionManager.handlePaymentSuccess(
        body.orderRef,
        body.transactionId
      )
    }

    // Always return success to SimplePay
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('IPN handler error:', error)
    // Still return success to avoid SimplePay retries
    return NextResponse.json({ success: true })
  }
}