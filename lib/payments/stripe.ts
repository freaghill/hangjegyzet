import Stripe from 'stripe'

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

export interface StripePaymentRequest {
  amount: number // in HUF
  description: string
  customerEmail: string
  metadata?: Record<string, string>
  successUrl: string
  cancelUrl: string
}

export interface StripeSubscriptionRequest {
  priceId: string
  customerEmail: string
  metadata?: Record<string, string>
  successUrl: string
  cancelUrl: string
}

export class StripePayment {
  /**
   * Create a one-time payment session
   */
  async createPaymentSession(request: StripePaymentRequest) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'huf',
              product_data: {
                name: request.description,
              },
              unit_amount: request.amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        customer_email: request.customerEmail,
        metadata: request.metadata,
        locale: 'hu',
      })

      return {
        success: true,
        sessionId: session.id,
        paymentUrl: session.url,
      }
    } catch (error) {
      console.error('Stripe payment session error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create payment session',
      }
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(request: StripeSubscriptionRequest) {
    try {
      // Check if customer exists
      let customer
      const existingCustomers = await stripe.customers.list({
        email: request.customerEmail,
        limit: 1,
      })

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0]
      } else {
        // Create new customer
        customer = await stripe.customers.create({
          email: request.customerEmail,
          metadata: request.metadata,
        })
      }

      // Create checkout session for subscription
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: request.priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        customer: customer.id,
        locale: 'hu',
        subscription_data: {
          metadata: request.metadata,
        },
      })

      return {
        success: true,
        sessionId: session.id,
        subscriptionUrl: session.url,
      }
    } catch (error) {
      console.error('Stripe subscription error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create subscription',
      }
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      })

      return {
        success: true,
        subscription,
      }
    } catch (error) {
      console.error('Stripe cancel subscription error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel subscription',
      }
    }
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(rawBody: string, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
    
    try {
      const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object as Stripe.Checkout.Session
          // Handle successful payment
          return {
            success: true,
            type: 'payment_success',
            sessionId: session.id,
            customerId: session.customer,
            metadata: session.metadata,
          }

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object as Stripe.Subscription
          return {
            success: true,
            type: 'subscription_updated',
            subscriptionId: subscription.id,
            customerId: subscription.customer,
            status: subscription.status,
            metadata: subscription.metadata,
          }

        case 'customer.subscription.deleted':
          const deletedSub = event.data.object as Stripe.Subscription
          return {
            success: true,
            type: 'subscription_cancelled',
            subscriptionId: deletedSub.id,
            customerId: deletedSub.customer,
          }

        case 'invoice.payment_failed':
          const invoice = event.data.object as Stripe.Invoice
          return {
            success: true,
            type: 'payment_failed',
            invoiceId: invoice.id,
            customerId: invoice.customer,
            attemptCount: invoice.attempt_count,
          }

        default:
          return {
            success: true,
            type: 'unhandled',
            eventType: event.type,
          }
      }
    } catch (error) {
      console.error('Stripe webhook error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook processing failed',
      }
    }
  }

  /**
   * Create a customer portal session for subscription management
   */
  async createPortalSession(customerId: string, returnUrl: string) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
        locale: 'hu',
      })

      return {
        success: true,
        url: session.url,
      }
    } catch (error) {
      console.error('Stripe portal session error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create portal session',
      }
    }
  }
}

// Export singleton instance
export const stripePayment = new StripePayment()

// Stripe price IDs for subscription plans (you need to create these in Stripe Dashboard)
export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
}