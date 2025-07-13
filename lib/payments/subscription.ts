import { createClient } from '@/lib/supabase/server'
import { simplePay } from './simplepay'
import { billingo } from './billingo'
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from './subscription-plans'

// Remove the duplicate SUBSCRIPTION_PLANS definition
const _REMOVED_SUBSCRIPTION_PLANS = {
  trial: {
    id: 'trial',
    name: 'Próbaidőszak',
    price: 0,
    duration: 14, // days
    limits: {
      minutesPerMonth: 500,
      users: 3,
      storage: 30, // days
    },
    features: [
      '500 perc/hó',
      '3 felhasználó',
      '30 napos tárolás',
      'Email támogatás',
    ],
  },
  starter: {
    id: 'starter',
    name: 'Kezdő',
    price: 24900, // HUF - Alanyi adómentes (no VAT)
    duration: 30, // days
    limits: {
      minutesPerMonth: 500,
      users: 3,
      storage: 90, // days
    },
    features: [
      '500 perc/hó',
      '3 felhasználó',
      '90 napos tárolás',
      'Email támogatás',
      'Alapvető integrációk',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Professzionális',
    price: 74900, // HUF - Alanyi adómentes
    duration: 30,
    limits: {
      minutesPerMonth: 2000,
      users: 10,
      storage: -1, // unlimited
    },
    features: [
      '2000 perc/hó',
      '10 felhasználó',
      'Korlátlan tárolás',
      'Prioritás támogatás',
      'Minden integráció',
      'Egyedi szótár',
      'API hozzáférés',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Vállalati',
    price: 224900, // HUF - Alanyi adómentes
    duration: 30,
    limits: {
      minutesPerMonth: -1, // unlimited
      users: -1, // unlimited
      storage: -1, // unlimited
    },
    features: [
      'Korlátlan használat',
      'Korlátlan felhasználó',
      'API hozzáférés',
      'White label opció',
      'Dedikált támogatás',
      'Egyedi fejlesztések',
      'SLA garancia',
    ],
  },
}

export class SubscriptionManager {
  /**
   * Create a new subscription
   */
  async createSubscription(
    organizationId: string,
    plan: SubscriptionPlan,
    billingData: {
      name: string
      company?: string
      taxNumber?: string // Adószám
      address: string
      city: string
      zip: string
      country?: string
      email?: string
    }
  ) {
    const supabase = await createClient()
    
    // Check if organization exists
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      throw new Error('Szervezet nem található')
    }

    // Generate order reference
    const orderRef = `HJ-${Date.now()}-${organizationId.substring(0, 8)}`
    
    // Get plan details
    const planDetails = SUBSCRIPTION_PLANS[plan]
    
    // Create payment request
    const paymentRequest = {
      orderRef,
      customerEmail: billingData.email || 'noreply@hangjegyzet.hu', // Default email if not provided
      language: 'HU',
      total: planDetails.price, // Alanyi adómentes - no VAT
      items: [{
        ref: plan,
        title: `HangJegyzet.AI ${planDetails.name} előfizetés (1 hónap)`,
        amount: planDetails.price,
        qty: 1,
      }],
      invoice: {
        name: billingData.name,
        company: billingData.company,
        country: billingData.country || 'HU',
        city: billingData.city,
        zip: billingData.zip,
        address: billingData.address,
        taxNumber: billingData.taxNumber,
      },
      urls: {
        success: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/success`,
        fail: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/fail`,
        cancel: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cancel`,
        timeout: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/timeout`,
      },
    }

    // Start payment
    const paymentResult = await simplePay.startPayment(paymentRequest)
    
    if (!paymentResult.success) {
      throw new Error(paymentResult.error || 'Fizetés indítása sikertelen')
    }

    // Store subscription intent in database
    const { error: subError } = await supabase
      .from('subscription_intents')
      .insert({
        organization_id: organizationId,
        plan: plan,
        order_ref: orderRef,
        transaction_id: paymentResult.transactionId,
        status: 'pending',
        amount: planDetails.price,
        billing_data: billingData,
      })

    if (subError) {
      throw new Error('Előfizetés mentése sikertelen')
    }

    return {
      paymentUrl: paymentResult.paymentUrl,
      transactionId: paymentResult.transactionId,
      orderRef,
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(orderRef: string, transactionId: string) {
    const supabase = await createClient()
    
    // Verify transaction with SimplePay
    const transaction = await simplePay.queryTransaction(transactionId)
    
    if (transaction.status !== 'SUCCESS') {
      throw new Error('Tranzakció ellenőrzése sikertelen')
    }

    // Get subscription intent
    const { data: intent, error: intentError } = await supabase
      .from('subscription_intents')
      .select('*')
      .eq('order_ref', orderRef)
      .single()

    if (intentError || !intent) {
      throw new Error('Előfizetés nem található')
    }

    // Calculate subscription end date
    const plan = SUBSCRIPTION_PLANS[intent.plan as SubscriptionPlan]
    const endsAt = new Date()
    endsAt.setDate(endsAt.getDate() + plan.duration)

    // Update organization subscription
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        subscription_tier: intent.plan,
        subscription_ends_at: endsAt.toISOString(),
        billing_data: intent.billing_data,
      })
      .eq('id', intent.organization_id)

    if (updateError) {
      throw new Error('Előfizetés aktiválása sikertelen')
    }

    // Update subscription intent
    await supabase
      .from('subscription_intents')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', intent.id)

    // Create invoice record
    await this.createInvoice(intent.organization_id, intent)

    return true
  }

  /**
   * Create invoice using Billingo
   */
  private async createInvoice(organizationId: string, subscriptionData: {
    plan: SubscriptionPlan
    billing_data: {
      name: string
      email?: string
      address: string
      city: string
      zip: string
      taxNumber?: string
      company?: string
    }
    transaction_id: string
  }) {
    const supabase = await createClient()
    
    try {
      // Get plan details
      const plan = SUBSCRIPTION_PLANS[subscriptionData.plan as SubscriptionPlan]
      
      // Create invoice in Billingo
      const billingoInvoice = await billingo.createSubscriptionInvoice(
        {
          name: subscriptionData.billing_data.name,
          email: subscriptionData.billing_data.email || '',
          address: subscriptionData.billing_data.address,
          city: subscriptionData.billing_data.city,
          zip: subscriptionData.billing_data.zip,
          taxcode: subscriptionData.billing_data.taxNumber,
          company: subscriptionData.billing_data.company,
        },
        {
          name: plan.name,
          price: plan.price,
          period: '1 hónap',
        },
        'online_bankcard' // SimplePay
      )
      
      // Store invoice reference in our database
      const { error } = await supabase
        .from('invoices')
        .insert({
          organization_id: organizationId,
          invoice_number: billingoInvoice.invoice_number,
          year: new Date().getFullYear(),
          issue_date: new Date().toISOString(),
          due_date: new Date().toISOString(), // Immediate payment
          net_amount: plan.price,
          vat_rate: 0, // Alanyi adómentes
          vat_amount: 0,
          gross_amount: plan.price,
          currency: 'HUF',
          status: 'paid',
          billing_data: subscriptionData.billing_data,
          items: [{
            description: `HangJegyzet.AI ${plan.name} előfizetés`,
            quantity: 1,
            unit_price: plan.price,
            net_amount: plan.price,
            vat_amount: 0,
            gross_amount: plan.price,
          }],
          payment_method: 'SimplePay',
          transaction_id: subscriptionData.transaction_id,
          metadata: {
            billingo_id: billingoInvoice.id,
            billingo_partner_id: billingoInvoice.partner_id,
          },
        })

      if (error) {
        console.error('Invoice storage error:', error)
      }
      
      return billingoInvoice
    } catch (error) {
      console.error('Billingo invoice creation error:', error)
      // Don't fail the subscription if invoice creation fails
      // We can retry later
    }
  }

  /**
   * Check if subscription is active
   */
  async checkSubscriptionStatus(organizationId: string): Promise<{
    isActive: boolean
    plan: SubscriptionPlan
    endsAt: Date | null
    daysRemaining: number
  }> {
    const supabase = await createClient()
    
    const { data: org, error } = await supabase
      .from('organizations')
      .select('subscription_tier, subscription_ends_at')
      .eq('id', organizationId)
      .single()

    if (error || !org) {
      return {
        isActive: false,
        plan: 'trial',
        endsAt: null,
        daysRemaining: 0,
      }
    }

    const endsAt = org.subscription_ends_at ? new Date(org.subscription_ends_at) : null
    const now = new Date()
    const isActive = !endsAt || endsAt > now
    const daysRemaining = endsAt ? Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0

    return {
      isActive,
      plan: org.subscription_tier as SubscriptionPlan,
      endsAt,
      daysRemaining: Math.max(0, daysRemaining),
    }
  }

  /**
   * Check usage limits
   */
  async checkUsageLimits(organizationId: string): Promise<{
    minutesUsed: number
    minutesLimit: number
    isWithinLimit: boolean
    percentageUsed: number
  }> {
    const supabase = await createClient()
    
    // Get current month usage
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01'
    
    const { data: usage } = await supabase
      .from('usage_stats')
      .select('minutes_used')
      .eq('organization_id', organizationId)
      .eq('month', currentMonth)
      .single()

    // Get organization plan
    const { data: org } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single()

    const plan = SUBSCRIPTION_PLANS[org?.subscription_tier as SubscriptionPlan] || SUBSCRIPTION_PLANS.trial
    const minutesUsed = usage?.minutes_used || 0
    const minutesLimit = plan.limits.minutesPerMonth
    const isWithinLimit = minutesLimit === -1 || minutesUsed < minutesLimit
    const percentageUsed = minutesLimit === -1 ? 0 : Math.round((minutesUsed / minutesLimit) * 100)

    return {
      minutesUsed,
      minutesLimit,
      isWithinLimit,
      percentageUsed,
    }
  }
}