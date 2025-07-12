import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const r = searchParams.get('r')
    
    if (r) {
      // Parse response to get order reference
      const responseData = JSON.parse(Buffer.from(r, 'base64').toString('utf-8'))
      
      // Update subscription intent status
      const supabase = await createClient()
      await supabase
        .from('subscription_intents')
        .update({ 
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('order_ref', responseData.o)
    }

    // Redirect to billing page
    return NextResponse.redirect(
      new URL('/settings/billing?cancelled=true', request.url)
    )
  } catch (error) {
    console.error('Payment cancel handler error:', error)
    return NextResponse.redirect(
      new URL('/settings/billing', request.url)
    )
  }
}