import { headers } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { ensureIdempotent } from '@/lib/utils/idempotency'
import { withRateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResponse = await withRateLimit(request, RATE_LIMITS.webhook)
  if (rateLimitResponse) return rateLimitResponse
  
  try {
    const body = await request.text()
    const signature = headers().get('stripe-signature')!
    
    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }
    
    // Handle event with idempotency
    const { processed, error } = await ensureIdempotent(
      event.id,
      event.type,
      async () => {
        await handleStripeEvent(event)
      }
    )
    
    if (error) {
      console.error('Event processing error:', error)
      // Return success to prevent Stripe retries for non-retryable errors
      if (error.message.includes('Organization not found')) {
        return NextResponse.json({ received: true })
      }
      // Return error for retryable issues
      return NextResponse.json(
        { error: 'Processing failed' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ 
      received: true, 
      processed,
      eventId: event.id 
    })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleStripeEvent(event: Stripe.Event) {
  const supabase = await createClient()
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      
      if (!session.customer || !session.subscription) {
        throw new Error('Missing customer or subscription')
      }
      
      // Get customer metadata
      const customer = await stripe.customers.retrieve(
        session.customer as string
      ) as Stripe.Customer
      
      if (!customer.metadata.organizationId) {
        throw new Error('Organization ID not found in customer metadata')
      }
      
      const organizationId = customer.metadata.organizationId
      
      // Start database transaction
      const { error: updateError } = await supabase.rpc('update_organization_subscription', {
        p_organization_id: organizationId,
        p_stripe_customer_id: customer.id,
        p_stripe_subscription_id: session.subscription as string,
        p_subscription_tier: customer.metadata.tier || 'profi',
        p_subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      
      if (updateError) {
        throw updateError
      }
      
      // Send confirmation email (non-blocking)
      sendSubscriptionConfirmation(customer.email!, customer.metadata.tier)
        .catch(err => console.error('Email send failed:', err))
      
      break
    }
    
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      
      // Handle subscription changes (upgrades, downgrades)
      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id)
      
      if (error) {
        throw error
      }
      
      break
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      
      // Handle cancellation
      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_tier: 'free',
          subscription_ends_at: new Date().toISOString(),
          stripe_subscription_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('stripe_subscription_id', subscription.id)
      
      if (error) {
        throw error
      }
      
      break
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      
      if (!invoice.subscription) break
      
      // Log payment failure
      await supabase.from('payment_failures').insert({
        organization_id: invoice.metadata?.organizationId,
        stripe_invoice_id: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        attempt_count: invoice.attempt_count,
        next_attempt_at: invoice.next_payment_attempt 
          ? new Date(invoice.next_payment_attempt * 1000).toISOString() 
          : null,
        created_at: new Date().toISOString()
      })
      
      // Send payment failure notification
      if (invoice.customer_email) {
        sendPaymentFailureNotification(invoice.customer_email, invoice.amount_due)
          .catch(err => console.error('Email send failed:', err))
      }
      
      break
    }
    
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}

// Email helper functions (implement with your email service)
async function sendSubscriptionConfirmation(email: string, tier: string) {
  console.log(`Sending subscription confirmation to ${email} for ${tier} tier`)
  // TODO: Implement with Resend/SendGrid/etc
}

async function sendPaymentFailureNotification(email: string, amount: number) {
  console.log(`Sending payment failure notification to ${email} for ${amount}`)
  // TODO: Implement with Resend/SendGrid/etc
}

// Example of the stored procedure for atomic subscription update
/*
CREATE OR REPLACE FUNCTION update_organization_subscription(
    p_organization_id UUID,
    p_stripe_customer_id TEXT,
    p_stripe_subscription_id TEXT,
    p_subscription_tier TEXT,
    p_subscription_ends_at TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
    UPDATE organizations
    SET 
        stripe_customer_id = p_stripe_customer_id,
        stripe_subscription_id = p_stripe_subscription_id,
        subscription_tier = p_subscription_tier,
        subscription_ends_at = p_subscription_ends_at,
        updated_at = NOW()
    WHERE id = p_organization_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Organization not found: %', p_organization_id;
    END IF;
    
    -- Update mode allocation based on tier
    UPDATE organizations
    SET mode_allocation = 
        CASE p_subscription_tier
            WHEN 'profi' THEN '{"fast": 2000, "balanced": 500, "precision": 50}'::JSONB
            WHEN 'vallalati' THEN '{"fast": 10000, "balanced": 2000, "precision": 200}'::JSONB
            WHEN 'unlimited' THEN '{"fast": -1, "balanced": -1, "precision": -1}'::JSONB
            ELSE '{"fast": 500, "balanced": 100, "precision": 0}'::JSONB
        END
    WHERE id = p_organization_id;
    
    -- Log the subscription change
    INSERT INTO subscription_history (
        organization_id,
        event_type,
        tier,
        metadata,
        created_at
    ) VALUES (
        p_organization_id,
        'subscription_updated',
        p_subscription_tier,
        jsonb_build_object(
            'stripe_customer_id', p_stripe_customer_id,
            'stripe_subscription_id', p_stripe_subscription_id
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql;
*/