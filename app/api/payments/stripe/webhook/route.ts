import { NextRequest, NextResponse } from 'next/server'
import { stripePayment } from '@/lib/payments/stripe'
import { createClient } from '@/lib/supabase/server'
import { SubscriptionManager } from '@/lib/payments/subscription'

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature')
    
    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    const rawBody = await request.text()
    const result = await stripePayment.handleWebhook(rawBody, signature)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const supabase = await createClient()

    switch (result.type) {
      case 'payment_success':
        // Handle successful payment
        if (result.metadata?.orderRef) {
          const subscriptionManager = new SubscriptionManager()
          await subscriptionManager.handlePaymentSuccess(
            result.metadata.orderRef,
            result.sessionId || ''
          )
        }
        break

      case 'subscription_updated':
        // Update subscription status in database
        if (result.metadata?.organizationId) {
          const { error } = await supabase
            .from('organizations')
            .update({
              stripe_subscription_id: result.subscriptionId,
              stripe_customer_id: result.customerId,
            })
            .eq('id', result.metadata.organizationId)

          if (error) {
            console.error('Failed to update organization:', error)
          }
        }
        break

      case 'subscription_cancelled':
        // Handle subscription cancellation
        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('stripe_subscription_id', result.subscriptionId)
          .single()

        if (org) {
          const { error } = await supabase
            .from('organizations')
            .update({
              subscription_cancelled_at: new Date().toISOString(),
            })
            .eq('id', org.id)

          if (error) {
            console.error('Failed to update cancellation:', error)
          }
        }
        break

      case 'payment_failed':
        // Handle failed payment
        console.error('Payment failed:', result)
        // TODO: Send notification to customer
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}