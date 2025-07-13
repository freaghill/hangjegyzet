import { createClient } from '@/lib/supabase/server'
import { PaymentManagerV2 } from './payment-manager-v2'
import { BillingoClient } from './providers/billingo/client'
import { getSubscriptionPlan, SUBSCRIPTION_PLANS } from './subscription-plans'
import type { PaymentProvider, PaymentIntent } from './types'

export interface Subscription {
  id: string
  organizationId: string
  planId: string
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  paymentMethod?: PaymentMethod
  metadata?: Record<string, any>
}

export interface PaymentMethod {
  id: string
  type: 'card' | 'bank_transfer' | 'barion_wallet' | 'simplepay_card'
  provider: PaymentProvider
  last4?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}

export interface SubscriptionCreateParams {
  organizationId: string
  planId: string
  paymentMethodId?: string
  trialDays?: number
  metadata?: Record<string, any>
}

export interface SubscriptionUpdateParams {
  planId?: string
  paymentMethodId?: string
  cancelAtPeriodEnd?: boolean
  metadata?: Record<string, any>
}

export class SubscriptionManager {
  private paymentManager: PaymentManagerV2
  private billingoClient: BillingoClient

  constructor() {
    this.paymentManager = new PaymentManagerV2()
    this.billingoClient = new BillingoClient(
      process.env.BILLINGO_API_KEY!,
      process.env.BILLINGO_BLOCK_ID!
    )
  }

  /**
   * Create a new subscription
   */
  async createSubscription(params: SubscriptionCreateParams): Promise<Subscription> {
    const { organizationId, planId, paymentMethodId, trialDays = 0, metadata } = params
    const supabase = await createClient()

    // Get plan details
    const plan = getSubscriptionPlan(planId)
    if (!plan) {
      throw new Error(`Invalid plan: ${planId}`)
    }

    // Check if organization already has a subscription
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (existingSubscription) {
      throw new Error('Organization already has an active subscription')
    }

    // Calculate subscription dates
    const now = new Date()
    const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000)
    const currentPeriodStart = trialDays > 0 ? trialEnd : now
    const currentPeriodEnd = new Date(
      currentPeriodStart.getTime() + plan.duration * 24 * 60 * 60 * 1000
    )

    // Create subscription record
    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        organization_id: organizationId,
        plan_id: planId,
        status: trialDays > 0 ? 'trialing' : 'active',
        current_period_start: currentPeriodStart.toISOString(),
        current_period_end: currentPeriodEnd.toISOString(),
        trial_end: trialDays > 0 ? trialEnd.toISOString() : null,
        cancel_at_period_end: false,
        metadata,
      })
      .select()
      .single()

    if (subscriptionError) {
      throw subscriptionError
    }

    // Update organization with subscription info
    await supabase
      .from('organizations')
      .update({
        subscription_tier: planId,
        subscription_status: subscription.status,
      })
      .eq('id', organizationId)

    // If not in trial, create immediate payment
    if (trialDays === 0 && plan.price > 0) {
      await this.createSubscriptionPayment(subscription.id, organizationId, plan, paymentMethodId)
    }

    // Schedule trial end notification if applicable
    if (trialDays > 0) {
      await this.scheduleTrialEndNotification(subscription.id, trialEnd)
    }

    return this.formatSubscription(subscription)
  }

  /**
   * Update an existing subscription
   */
  async updateSubscription(
    subscriptionId: string,
    params: SubscriptionUpdateParams
  ): Promise<Subscription> {
    const supabase = await createClient()

    // Get current subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (error || !subscription) {
      throw new Error('Subscription not found')
    }

    // Handle plan change
    if (params.planId && params.planId !== subscription.plan_id) {
      await this.changePlan(subscriptionId, subscription, params.planId)
    }

    // Update subscription record
    const { data: updated, error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_id: params.planId || subscription.plan_id,
        cancel_at_period_end: params.cancelAtPeriodEnd ?? subscription.cancel_at_period_end,
        metadata: { ...subscription.metadata, ...params.metadata },
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    return this.formatSubscription(updated)
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(
    subscriptionId: string,
    immediately: boolean = false
  ): Promise<Subscription> {
    const supabase = await createClient()

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (error || !subscription) {
      throw new Error('Subscription not found')
    }

    if (immediately) {
      // Cancel immediately
      await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          cancel_at_period_end: false,
        })
        .eq('id', subscriptionId)

      // Update organization
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'canceled',
        })
        .eq('id', subscription.organization_id)
    } else {
      // Cancel at period end
      await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          canceled_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId)
    }

    // Send cancellation email
    await this.sendCancellationEmail(subscription)

    const { data: updated } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    return this.formatSubscription(updated!)
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    const supabase = await createClient()

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (error || !subscription) {
      throw new Error('Subscription not found')
    }

    if (!subscription.cancel_at_period_end && subscription.status === 'canceled') {
      throw new Error('Cannot reactivate a canceled subscription')
    }

    await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: false,
        canceled_at: null,
      })
      .eq('id', subscriptionId)

    const { data: updated } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    return this.formatSubscription(updated!)
  }

  /**
   * Process subscription renewal
   */
  async processRenewal(subscriptionId: string): Promise<void> {
    const supabase = await createClient()

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    // Check if should cancel
    if (subscription.cancel_at_period_end) {
      await this.cancelSubscription(subscriptionId, true)
      return
    }

    // Get plan details
    const plan = getSubscriptionPlan(subscription.plan_id)
    if (!plan) {
      throw new Error('Plan not found')
    }

    // Create renewal payment
    try {
      await this.createSubscriptionPayment(
        subscriptionId,
        subscription.organization_id,
        plan
      )

      // Update subscription period
      const newPeriodStart = new Date(subscription.current_period_end)
      const newPeriodEnd = new Date(
        newPeriodStart.getTime() + plan.duration * 24 * 60 * 60 * 1000
      )

      await supabase
        .from('subscriptions')
        .update({
          current_period_start: newPeriodStart.toISOString(),
          current_period_end: newPeriodEnd.toISOString(),
          status: 'active',
        })
        .eq('id', subscriptionId)

      // Reset usage for new period
      await this.resetUsage(subscription.organization_id)
    } catch (error) {
      // Payment failed - mark as past due
      await supabase
        .from('subscriptions')
        .update({
          status: 'past_due',
        })
        .eq('id', subscriptionId)

      await this.sendPaymentFailedEmail(subscription)
      throw error
    }
  }

  /**
   * Create a payment for subscription
   */
  private async createSubscriptionPayment(
    subscriptionId: string,
    organizationId: string,
    plan: any,
    paymentMethodId?: string
  ): Promise<void> {
    const supabase = await createClient()

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (!organization) {
      throw new Error('Organization not found')
    }

    // Get or select payment method
    let paymentMethod: PaymentMethod | null = null
    if (paymentMethodId) {
      const { data } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('id', paymentMethodId)
        .single()
      paymentMethod = data
    } else {
      // Get default payment method
      const { data } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_default', true)
        .single()
      paymentMethod = data
    }

    // Create payment intent
    const paymentIntent: PaymentIntent = {
      amount: plan.price,
      currency: plan.currency,
      description: `${plan.name} előfizetés - ${organization.name}`,
      metadata: {
        subscriptionId,
        organizationId,
        planId: plan.id,
        type: 'subscription',
      },
    }

    // Determine provider based on currency and payment method
    const provider = plan.currency === 'EUR' ? 'barion' : 'simplepay'

    // Initialize payment
    const payment = await this.paymentManager.createPayment(provider, paymentIntent)

    // Store payment record
    await supabase
      .from('payments')
      .insert({
        id: payment.paymentId,
        organization_id: organizationId,
        subscription_id: subscriptionId,
        provider,
        amount: plan.price,
        currency: plan.currency,
        status: 'pending',
        description: paymentIntent.description,
        metadata: paymentIntent.metadata,
      })

    // If payment method exists, try to charge immediately
    if (paymentMethod && paymentMethod.provider === provider) {
      // This would require stored card tokens which SimplePay/Barion support
      // For now, redirect to payment page
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(paymentId: string): Promise<void> {
    const supabase = await createClient()

    // Get payment details
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (!payment || payment.metadata?.type !== 'subscription') {
      return
    }

    // Update subscription status
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        last_payment_date: new Date().toISOString(),
      })
      .eq('id', payment.subscription_id)

    // Generate invoice
    await this.generateInvoice(payment)

    // Send confirmation email
    await this.sendPaymentConfirmationEmail(payment)
  }

  /**
   * Generate invoice with Billingo
   */
  private async generateInvoice(payment: any): Promise<void> {
    const supabase = await createClient()

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', payment.organization_id)
      .single()

    if (!organization) return

    // Get plan details
    const plan = getSubscriptionPlan(payment.metadata.planId)
    if (!plan) return

    // Create or get partner in Billingo
    const partner = await this.billingoClient.createPartner({
      name: organization.name,
      address: {
        country_code: 'HU',
        post_code: organization.postal_code || '1111',
        city: organization.city || 'Budapest',
        address: organization.address || 'N/A',
      },
      emails: [organization.billing_email || organization.contact_email],
      taxcode: organization.tax_number,
    })

    // Create invoice
    const invoice = await this.billingoClient.createInvoice({
      partner_id: partner.id,
      block_id: parseInt(process.env.BILLINGO_BLOCK_ID!),
      type: 'invoice',
      fulfillment_date: new Date().toISOString().split('T')[0],
      due_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payment_method: payment.provider === 'barion' ? 'barion' : 'online_bankcard',
      language: 'hu',
      currency: plan.currency,
      paid: true,
      items: [
        {
          name: `${plan.name} előfizetés (${plan.duration} nap)`,
          unit_price: plan.price,
          unit_price_type: 'gross',
          quantity: 1,
          unit: 'db',
          vat: '27%',
          comment: `HangJegyzet.AI előfizetés - ${new Date().toISOString().split('T')[0]}`,
        },
      ],
      comment: `Fizetési azonosító: ${payment.id}`,
      settings: {
        mediated_service: false,
        without_financial_fulfillment: false,
      },
    })

    // Store invoice reference
    await supabase
      .from('invoices')
      .insert({
        organization_id: payment.organization_id,
        payment_id: payment.id,
        billingo_id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: plan.price,
        currency: plan.currency,
        status: 'paid',
        pdf_url: invoice.pdf_url,
      })

    // Send invoice
    await this.billingoClient.sendInvoice(invoice.id)
  }

  /**
   * Check and update subscription statuses
   */
  async checkSubscriptionStatuses(): Promise<void> {
    const supabase = await createClient()
    const now = new Date()

    // Check trial ending subscriptions
    const { data: trialEnding } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'trialing')
      .lte('trial_end', now.toISOString())

    for (const subscription of trialEnding || []) {
      await this.processTrialEnd(subscription.id)
    }

    // Check expiring subscriptions
    const { data: expiring } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .lte('current_period_end', now.toISOString())

    for (const subscription of expiring || []) {
      await this.processRenewal(subscription.id)
    }

    // Check past due subscriptions (retry after 3 days)
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    const { data: pastDue } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'past_due')
      .lte('current_period_end', threeDaysAgo.toISOString())

    for (const subscription of pastDue || []) {
      // Final cancellation after grace period
      await this.cancelSubscription(subscription.id, true)
    }
  }

  /**
   * Process trial end
   */
  private async processTrialEnd(subscriptionId: string): Promise<void> {
    const supabase = await createClient()

    // Update status
    await supabase
      .from('subscriptions')
      .update({
        status: 'active',
      })
      .eq('id', subscriptionId)

    // Create first payment
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (subscription) {
      const plan = getSubscriptionPlan(subscription.plan_id)
      if (plan && plan.price > 0) {
        await this.createSubscriptionPayment(
          subscriptionId,
          subscription.organization_id,
          plan
        )
      }
    }
  }

  /**
   * Get subscription usage
   */
  async getSubscriptionUsage(subscriptionId: string): Promise<any> {
    const supabase = await createClient()

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single()

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    // Get current period usage
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('organization_id', subscription.organization_id)
      .gte('date', subscription.current_period_start)
      .lte('date', subscription.current_period_end)

    // Aggregate usage by mode
    const modeUsage = {
      fast: 0,
      balanced: 0,
      precision: 0,
    }

    for (const record of usage || []) {
      if (record.mode && record.minutes_used) {
        modeUsage[record.mode as keyof typeof modeUsage] += record.minutes_used
      }
    }

    const plan = getSubscriptionPlan(subscription.plan_id)
    if (!plan) {
      throw new Error('Plan not found')
    }

    return {
      subscription,
      usage: modeUsage,
      limits: plan.limits.modeAllocation,
      percentages: {
        fast: plan.limits.modeAllocation.fast > 0
          ? (modeUsage.fast / plan.limits.modeAllocation.fast) * 100
          : 0,
        balanced: plan.limits.modeAllocation.balanced > 0
          ? (modeUsage.balanced / plan.limits.modeAllocation.balanced) * 100
          : 0,
        precision: plan.limits.modeAllocation.precision > 0
          ? (modeUsage.precision / plan.limits.modeAllocation.precision) * 100
          : 0,
      },
    }
  }

  /**
   * Reset usage for new period
   */
  private async resetUsage(organizationId: string): Promise<void> {
    // Usage is tracked by date, so no need to reset
    // The getSubscriptionUsage method filters by current period
  }

  /**
   * Format subscription for API response
   */
  private formatSubscription(subscription: any): Subscription {
    return {
      id: subscription.id,
      organizationId: subscription.organization_id,
      planId: subscription.plan_id,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start),
      currentPeriodEnd: new Date(subscription.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      metadata: subscription.metadata,
    }
  }

  /**
   * Email notification methods
   */
  private async scheduleTrialEndNotification(subscriptionId: string, trialEnd: Date): Promise<void> {
    // Queue email job for 3 days before trial end
    const notifyDate = new Date(trialEnd.getTime() - 3 * 24 * 60 * 60 * 1000)
    // Implementation depends on your job queue
  }

  private async sendCancellationEmail(subscription: any): Promise<void> {
    // Send cancellation confirmation email
  }

  private async sendPaymentFailedEmail(subscription: any): Promise<void> {
    // Send payment failed notification
  }

  private async sendPaymentConfirmationEmail(payment: any): Promise<void> {
    // Send payment confirmation with invoice
  }

  /**
   * Change subscription plan
   */
  private async changePlan(
    subscriptionId: string,
    currentSubscription: any,
    newPlanId: string
  ): Promise<void> {
    const currentPlan = getSubscriptionPlan(currentSubscription.plan_id)
    const newPlan = getSubscriptionPlan(newPlanId)

    if (!currentPlan || !newPlan) {
      throw new Error('Invalid plan')
    }

    // Calculate proration if upgrading
    if (newPlan.price > currentPlan.price) {
      const now = new Date()
      const periodStart = new Date(currentSubscription.current_period_start)
      const periodEnd = new Date(currentSubscription.current_period_end)
      
      const totalDays = (periodEnd.getTime() - periodStart.getTime()) / (24 * 60 * 60 * 1000)
      const remainingDays = (periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      
      const remainingValue = (currentPlan.price / totalDays) * remainingDays
      const newPeriodCost = (newPlan.price / newPlan.duration) * remainingDays
      const proratedAmount = Math.max(0, newPeriodCost - remainingValue)

      if (proratedAmount > 0) {
        // Create prorated payment
        const paymentIntent: PaymentIntent = {
          amount: proratedAmount,
          currency: newPlan.currency,
          description: `Csomag váltás: ${currentPlan.name} → ${newPlan.name} (időarányos)`,
          metadata: {
            subscriptionId,
            type: 'proration',
            fromPlan: currentPlan.id,
            toPlan: newPlan.id,
          },
        }

        const provider = newPlan.currency === 'EUR' ? 'barion' : 'simplepay'
        await this.paymentManager.createPayment(provider, paymentIntent)
      }
    }
  }
}

export const subscriptionManager = new SubscriptionManager()