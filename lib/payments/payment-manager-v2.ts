import { getBarionService } from './barion'
import { getSimplePayService } from './simplepay-v2'
import { SUBSCRIPTION_PLANS } from './subscription-plans'
import { PaymentInitRequest, PaymentProvider } from './types'

export type PaymentProviderType = 'barion' | 'simplepay'

export class PaymentManager {
  private providers: Record<PaymentProviderType, PaymentProvider>

  constructor() {
    this.providers = {
      barion: getBarionService(),
      simplepay: getSimplePayService()
    }
  }

  async createPayment(
    provider: PaymentProviderType,
    request: PaymentInitRequest
  ) {
    const service = this.providers[provider]
    if (!service) {
      throw new Error(`Payment provider ${provider} not found`)
    }

    return await service.initializePayment(request)
  }

  async createSubscriptionPayment(
    provider: PaymentProviderType,
    planId: keyof typeof SUBSCRIPTION_PLANS,
    customerData: {
      email: string
      name?: string
      phone?: string
    }
  ) {
    const plan = SUBSCRIPTION_PLANS[planId]
    if (!plan) {
      throw new Error(`Subscription plan ${planId} not found`)
    }

    const request: PaymentInitRequest = {
      orderId: `SUB-${planId}-${Date.now()}`,
      amount: plan.price,
      currency: 'EUR',
      description: `HangJegyzet.AI ${plan.name} előfizetés`,
      productId: planId,
      customerEmail: customerData.email,
      customerName: customerData.name,
      customerPhone: customerData.phone,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?payment=success`,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/${provider}/webhook`,
      metadata: {
        type: 'subscription',
        planId: planId,
        userId: '', // Will be filled by the API
      }
    }

    return await this.createPayment(provider, request)
  }

  async getPaymentStatus(
    provider: PaymentProviderType,
    paymentId: string
  ) {
    const service = this.providers[provider]
    if (!service) {
      throw new Error(`Payment provider ${provider} not found`)
    }

    return await service.getPaymentStatus(paymentId)
  }

  async refundPayment(
    provider: PaymentProviderType,
    paymentId: string,
    transactionId: string,
    amount: number,
    reason?: string
  ) {
    const service = this.providers[provider]
    if (!service) {
      throw new Error(`Payment provider ${provider} not found`)
    }

    return await service.refundPayment({
      paymentId,
      transactionId,
      amount,
      reason
    })
  }

  validateWebhook(
    provider: PaymentProviderType,
    payload: any,
    signature: string
  ): boolean {
    const service = this.providers[provider]
    if (!service || !service.validateWebhook) {
      return false
    }

    return service.validateWebhook(payload, signature)
  }

  getAvailableProviders() {
    return [
      {
        id: 'barion' as PaymentProviderType,
        name: 'Barion',
        description: 'Biztonságos online fizetés bankkártyával',
        logo: '/images/barion-logo.png',
        available: !!process.env.BARION_SHOP_ID,
        methods: ['card', 'barion_wallet'],
        currencies: ['HUF', 'EUR', 'USD'],
        fees: '1.79% + 99 Ft'
      },
      {
        id: 'simplepay' as PaymentProviderType,
        name: 'SimplePay (OTP)',
        description: 'Kártyás fizetés OTP SimplePay rendszerén keresztül',
        logo: '/images/simplepay-logo.png',
        available: !!process.env.SIMPLEPAY_MERCHANT_ID,
        methods: ['card', 'wire'],
        currencies: ['HUF', 'EUR'],
        fees: '1.99% + 125 Ft'
      }
    ].filter(p => p.available)
  }

  getRecommendedProvider(currency: string = 'EUR'): PaymentProviderType {
    // Prefer Barion for EUR/USD, SimplePay for HUF
    if (currency === 'HUF') {
      return process.env.SIMPLEPAY_MERCHANT_ID ? 'simplepay' : 'barion'
    }
    return process.env.BARION_SHOP_ID ? 'barion' : 'simplepay'
  }
}

// Singleton instance
let paymentManagerInstance: PaymentManager | null = null

export function getPaymentManager(): PaymentManager {
  if (!paymentManagerInstance) {
    paymentManagerInstance = new PaymentManager()
  }
  return paymentManagerInstance
}