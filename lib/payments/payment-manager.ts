import { simplePay } from './simplepay'
import { stripePayment, STRIPE_PRICE_IDS } from './stripe'
import { SUBSCRIPTION_PLANS } from './subscription-plans'

// Type for billing data
export interface BillingData {
  name: string
  company?: string
  country: string
  state?: string
  city: string
  zip: string
  address: string
  phone?: string
}

// Type for subscription plan
export interface SubscriptionPlanData {
  id: string
  name: string
  price: number
  duration: number
  limits: {
    minutesPerMonth: number
    users: number
    storage: number
  }
  features: string[]
}

export type PaymentProvider = 'simplepay' | 'stripe' | 'paypal'

export interface PaymentRequest {
  provider: PaymentProvider
  amount: number
  currency: string
  description: string
  customerEmail: string
  metadata?: Record<string, string>
  successUrl: string
  cancelUrl: string
}

export interface SubscriptionRequest {
  provider: PaymentProvider
  plan: keyof typeof SUBSCRIPTION_PLANS
  customerEmail: string
  billingData: BillingData
  metadata?: Record<string, string>
}

export class PaymentManager {
  /**
   * Create a payment session with the selected provider
   */
  async createPayment(request: PaymentRequest) {
    switch (request.provider) {
      case 'simplepay':
        return await this.createSimplePayPayment(request)
      
      case 'stripe':
        return await this.createStripePayment(request)
      
      case 'paypal':
        return await this.createPayPalPayment(request)
      
      default:
        throw new Error(`Unsupported payment provider: ${request.provider}`)
    }
  }

  /**
   * Create a subscription with the selected provider
   */
  async createSubscription(request: SubscriptionRequest) {
    const plan = SUBSCRIPTION_PLANS[request.plan]
    
    switch (request.provider) {
      case 'simplepay':
        return await this.createSimplePaySubscription(request, plan)
      
      case 'stripe':
        return await this.createStripeSubscription(request, plan)
      
      case 'paypal':
        return await this.createPayPalSubscription(request, plan)
      
      default:
        throw new Error(`Unsupported payment provider: ${request.provider}`)
    }
  }

  /**
   * SimplePay implementation
   */
  private async createSimplePayPayment(request: PaymentRequest) {
    const orderRef = `HJ-${Date.now()}`
    
    const paymentRequest = {
      orderRef,
      customerEmail: request.customerEmail,
      language: 'HU',
      total: request.amount,
      items: [{
        ref: 'payment',
        title: request.description,
        amount: request.amount,
        qty: 1,
      }],
      urls: {
        success: request.successUrl,
        fail: request.cancelUrl,
        cancel: request.cancelUrl,
        timeout: request.cancelUrl,
      },
    }

    const result = await simplePay.startPayment(paymentRequest)
    
    return {
      provider: 'simplepay',
      success: result.success,
      paymentUrl: result.paymentUrl,
      transactionId: result.transactionId,
      orderRef,
      error: result.error,
    }
  }

  private async createSimplePaySubscription(request: SubscriptionRequest, plan: SubscriptionPlanData) {
    const orderRef = `HJ-SUB-${Date.now()}`
    
    const paymentRequest = {
      orderRef,
      customerEmail: request.customerEmail,
      language: 'HU',
      total: plan.price,
      items: [{
        ref: request.plan,
        title: `HangJegyzet ${plan.name} előfizetés (1 hónap)`,
        amount: plan.price,
        qty: 1,
      }],
      invoice: request.billingData,
      urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/success`,
        fail: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/fail`,
        cancel: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cancel`,
        timeout: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/timeout`,
      },
    }

    const result = await simplePay.startPayment(paymentRequest)
    
    return {
      provider: 'simplepay',
      success: result.success,
      paymentUrl: result.paymentUrl,
      transactionId: result.transactionId,
      orderRef,
      error: result.error,
    }
  }

  /**
   * Stripe implementation
   */
  private async createStripePayment(request: PaymentRequest) {
    const result = await stripePayment.createPaymentSession({
      amount: request.amount * 100, // Stripe uses smallest currency unit
      description: request.description,
      customerEmail: request.customerEmail,
      metadata: request.metadata,
      successUrl: request.successUrl,
      cancelUrl: request.cancelUrl,
    })

    return {
      provider: 'stripe',
      success: result.success,
      paymentUrl: result.paymentUrl,
      transactionId: result.sessionId,
      error: result.error,
    }
  }

  private async createStripeSubscription(request: SubscriptionRequest, plan: SubscriptionPlanData) {
    const priceId = STRIPE_PRICE_IDS[request.plan]
    
    if (!priceId) {
      throw new Error(`Stripe price ID not configured for plan: ${request.plan}`)
    }

    const result = await stripePayment.createSubscription({
      priceId,
      customerEmail: request.customerEmail,
      metadata: {
        plan: request.plan,
        ...request.metadata,
      },
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/stripe/success`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/stripe/cancel`,
    })

    return {
      provider: 'stripe',
      success: result.success,
      paymentUrl: result.subscriptionUrl,
      transactionId: result.sessionId,
      error: result.error,
    }
  }

  /**
   * PayPal implementation (placeholder)
   */
  private async createPayPalPayment(request: PaymentRequest) {
    // PayPal integration would go here
    // Using PayPal SDK: https://developer.paypal.com/docs/checkout/
    
    throw new Error('PayPal integration not implemented yet')
  }

  private async createPayPalSubscription(request: SubscriptionRequest, plan: SubscriptionPlanData) {
    // PayPal subscription integration would go here
    // Using PayPal Subscriptions API: https://developer.paypal.com/docs/subscriptions/
    
    throw new Error('PayPal subscription not implemented yet')
  }

  /**
   * Get available payment providers
   */
  getAvailableProviders(): Array<{
    id: PaymentProvider
    name: string
    description: string
    logo: string
    available: boolean
  }> {
    return [
      {
        id: 'simplepay',
        name: 'SimplePay',
        description: 'Bankkártyás fizetés',
        logo: '/images/simplepay-logo.png',
        available: true,
      },
      {
        id: 'stripe',
        name: 'Stripe',
        description: 'Nemzetközi kártyás fizetés',
        logo: '/images/stripe-logo.png',
        available: !!process.env.STRIPE_SECRET_KEY,
      },
      {
        id: 'paypal',
        name: 'PayPal',
        description: 'PayPal fizetés',
        logo: '/images/paypal-logo.png',
        available: false, // Not implemented yet
      },
    ]
  }
}

// Export singleton instance
export const paymentManager = new PaymentManager()