import { NextRequest, NextResponse } from 'next/server'
import { SubscriptionManager } from '@/lib/payments/subscription'
import { simplePay } from '@/lib/payments/simplepay'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const r = searchParams.get('r')
    const s = searchParams.get('s')
    
    if (!r || !s) {
      return NextResponse.redirect(
        new URL('/settings/billing?error=missing_params', request.url)
      )
    }

    // Verify redirect signature
    const isValid = simplePay.verifyRedirectSignature(r, s)
    if (!isValid) {
      return NextResponse.redirect(
        new URL('/settings/billing?error=invalid_signature', request.url)
      )
    }

    // Parse response data
    const responseData = simplePay.parseResponse(r)
    
    if (responseData.e === 'SUCCESS') {
      // Handle successful payment
      const subscriptionManager = new SubscriptionManager()
      await subscriptionManager.handlePaymentSuccess(
        responseData.o,  // orderRef
        responseData.t   // transactionId
      )

      // Redirect to success page
      return NextResponse.redirect(
        new URL('/settings/billing?success=true', request.url)
      )
    } else {
      // Payment was not successful
      return NextResponse.redirect(
        new URL(`/settings/billing?error=${responseData.e}`, request.url)
      )
    }
  } catch (error) {
    console.error('Payment success handler error:', error)
    return NextResponse.redirect(
      new URL('/settings/billing?error=processing_error', request.url)
    )
  }
}