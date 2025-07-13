import crypto from 'crypto'
import { SimplePayClient } from './client'

export interface RecurringPaymentRequest {
  orderRef: string
  customerEmail: string
  language: string
  currency: string
  amount: number
  recurring: {
    times: number // Number of recurring payments
    until?: string // End date for recurring
    maxAmount?: number // Maximum amount per transaction
  }
  cardData?: {
    // For tokenized cards
    token?: string
    // For registered cards
    registrationId?: string
  }
}

export interface RecurringRegistration {
  registrationId: string
  cardMask: string
  expiry: string
  customerId: string
}

export class SimplePayRecurring {
  private client: SimplePayClient

  constructor(client: SimplePayClient) {
    this.client = client
  }

  /**
   * Register a card for recurring payments
   */
  async registerCard(
    customerEmail: string,
    returnUrl: string,
    customerId: string
  ): Promise<{ paymentUrl: string; transactionId: string }> {
    const orderRef = `REG-${Date.now()}-${Math.random().toString(36).substring(7)}`
    
    const request = {
      salt: this.generateSalt(),
      merchant: process.env.SIMPLEPAY_MERCHANT!,
      orderRef,
      currency: 'HUF',
      customerEmail,
      language: 'HU',
      sdkVersion: 'SimplePay_PHP_SDK_2.0.9',
      methods: ['CARD'],
      total: 10, // Minimum amount for card verification
      timeout: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      url: returnUrl,
      invoice: {
        name: customerEmail,
        country: 'HU',
        state: 'N/A',
        city: 'N/A',
        zip: '0000',
        address: 'N/A',
      },
      recurring: {
        times: 0, // 0 means registration only
        registerCard: true,
      },
      threeDSReqAuthMethod: '02', // Recurring payment
      customerRegisterDate: new Date().toISOString().split('T')[0],
    }

    // Add metadata
    const requestWithMeta = {
      ...request,
      metadata: {
        customerId,
        type: 'card_registration',
      },
    }

    // Generate signature
    const signature = this.generateSignature(requestWithMeta)
    
    // Make request
    const response = await fetch(`${this.client['getApiUrl']()}/v2/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Signature': signature,
      },
      body: JSON.stringify(requestWithMeta),
    })

    const data = await response.json()
    
    if (!response.ok || data.errorCodes) {
      throw new Error(data.errorCodes?.join(', ') || 'Card registration failed')
    }

    return {
      paymentUrl: data.paymentUrl,
      transactionId: data.transactionId,
    }
  }

  /**
   * Create a recurring payment with registered card
   */
  async chargeRecurring(
    registrationId: string,
    amount: number,
    orderRef: string,
    description: string
  ): Promise<{ transactionId: string; status: string }> {
    const request = {
      salt: this.generateSalt(),
      merchant: process.env.SIMPLEPAY_MERCHANT!,
      orderRef,
      currency: 'HUF',
      total: amount,
      language: 'HU',
      sdkVersion: 'SimplePay_PHP_SDK_2.0.9',
      methods: ['CARD'],
      cardData: {
        registrationId,
      },
      recurring: {
        times: 1,
      },
      invoice: {
        name: 'Recurring charge',
        country: 'HU',
        state: 'N/A',
        city: 'N/A',
        zip: '0000',
        address: 'N/A',
      },
      items: [{
        ref: 'SUBSCRIPTION',
        title: description,
        amount: amount,
        qty: 1,
      }],
    }

    // Generate signature
    const signature = this.generateSignature(request)
    
    // Make request
    const response = await fetch(`${this.client['getApiUrl']()}/v2/do`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Signature': signature,
      },
      body: JSON.stringify(request),
    })

    const data = await response.json()
    
    if (!response.ok || data.errorCodes) {
      throw new Error(data.errorCodes?.join(', ') || 'Recurring payment failed')
    }

    return {
      transactionId: data.transactionId,
      status: data.status,
    }
  }

  /**
   * Get registered cards for a customer
   */
  async getRegisteredCards(customerId: string): Promise<RecurringRegistration[]> {
    // SimplePay doesn't provide a direct API for this
    // You need to store card registrations in your database
    // This is a placeholder for the database query
    
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    const { data: cards } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('customer_id', customerId)
      .eq('provider', 'simplepay')
      .eq('type', 'card')
    
    return cards?.map(card => ({
      registrationId: card.provider_reference,
      cardMask: card.last4 ? `****${card.last4}` : '****',
      expiry: card.expiry_month && card.expiry_year 
        ? `${card.expiry_month}/${card.expiry_year}`
        : '',
      customerId: card.customer_id,
    })) || []
  }

  /**
   * Delete a registered card
   */
  async deleteRegistration(registrationId: string): Promise<void> {
    // SimplePay doesn't provide card deletion API
    // Mark as inactive in database
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    await supabase
      .from('payment_methods')
      .update({ 
        active: false,
        deleted_at: new Date().toISOString(),
      })
      .eq('provider_reference', registrationId)
  }

  /**
   * Create a subscription with recurring payments
   */
  async createSubscription(
    customerId: string,
    planId: string,
    registrationId?: string
  ): Promise<{ subscriptionId: string; nextPaymentDate: Date }> {
    const { getSubscriptionPlan } = await import('../../subscription-plans')
    const plan = getSubscriptionPlan(planId)
    
    if (!plan) {
      throw new Error('Invalid plan')
    }

    const subscriptionId = `SUB-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const nextPaymentDate = new Date()
    nextPaymentDate.setDate(nextPaymentDate.getDate() + plan.duration)

    // Store subscription in database
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    await supabase
      .from('recurring_subscriptions')
      .insert({
        subscription_id: subscriptionId,
        customer_id: customerId,
        plan_id: planId,
        registration_id: registrationId,
        amount: plan.price,
        currency: plan.currency,
        interval_days: plan.duration,
        next_payment_date: nextPaymentDate.toISOString(),
        status: 'active',
      })

    // If registration ID provided, charge immediately
    if (registrationId) {
      await this.chargeRecurring(
        registrationId,
        plan.price,
        `${subscriptionId}-${Date.now()}`,
        `${plan.name} előfizetés`
      )
    }

    return {
      subscriptionId,
      nextPaymentDate,
    }
  }

  /**
   * Process scheduled recurring payments
   */
  async processScheduledPayments(): Promise<void> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    // Get due subscriptions
    const { data: dueSubscriptions } = await supabase
      .from('recurring_subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('next_payment_date', new Date().toISOString())
    
    for (const subscription of dueSubscriptions || []) {
      try {
        // Charge the card
        const result = await this.chargeRecurring(
          subscription.registration_id,
          subscription.amount,
          `${subscription.subscription_id}-${Date.now()}`,
          'Előfizetés megújítás'
        )

        // Update next payment date
        const nextDate = new Date()
        nextDate.setDate(nextDate.getDate() + subscription.interval_days)
        
        await supabase
          .from('recurring_subscriptions')
          .update({
            last_payment_date: new Date().toISOString(),
            next_payment_date: nextDate.toISOString(),
            last_transaction_id: result.transactionId,
          })
          .eq('subscription_id', subscription.subscription_id)
          
        // Update main subscription status
        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: nextDate.toISOString(),
          })
          .eq('id', subscription.subscription_id)
          
      } catch (error) {
        console.error(`Failed to process recurring payment for ${subscription.subscription_id}:`, error)
        
        // Mark subscription as failed
        await supabase
          .from('recurring_subscriptions')
          .update({
            status: 'payment_failed',
            last_error: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('subscription_id', subscription.subscription_id)
          
        // Update main subscription
        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('id', subscription.subscription_id)
      }
    }
  }

  /**
   * Cancel a recurring subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    
    await supabase
      .from('recurring_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('subscription_id', subscriptionId)
  }

  /**
   * Generate salt for request
   */
  private generateSalt(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Generate signature for request
   */
  private generateSignature(data: any): string {
    const secretKey = process.env.SIMPLEPAY_SECRET_KEY!
    const dataString = JSON.stringify(data)
    
    return crypto
      .createHmac('sha384', secretKey)
      .update(dataString)
      .digest('base64')
  }
}

// Export for cron job
export async function processSimplePayRecurringPayments(): Promise<void> {
  const client = new SimplePayClient(
    process.env.SIMPLEPAY_MERCHANT!,
    process.env.SIMPLEPAY_SECRET_KEY!,
    process.env.NODE_ENV === 'production'
  )
  
  const recurring = new SimplePayRecurring(client)
  await recurring.processScheduledPayments()
}