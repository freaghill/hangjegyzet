import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const paymentId = searchParams.get('paymentId')
  const success = searchParams.get('success') === 'true'
  
  if (success && paymentId) {
    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/dashboard/settings/billing?payment=success&id=${paymentId}`, request.url)
    )
  } else {
    // Redirect to failure page
    return NextResponse.redirect(
      new URL('/dashboard/settings/billing?payment=failed', request.url)
    )
  }
}