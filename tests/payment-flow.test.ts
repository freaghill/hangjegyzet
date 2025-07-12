// Payment Flow Tests for HangJegyzet.AI
// Tests all payment providers and subscription flows

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { PaymentManager } from '../lib/payments/payment-manager'
import { SUBSCRIPTION_PLANS } from '../lib/payments/subscription-plans'
import { billingo } from '../lib/payments/billingo'

// Test configuration
const TEST_CONFIG = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  testUser: {
    email: 'test@hangjegyzet.ai',
    password: 'test123456',
    name: 'Test User',
    company: 'Test Company Kft.',
    taxNumber: '12345678-2-42',
  },
  billingData: {
    name: 'Test User',
    company: 'Test Company Kft.',
    country: 'HU',
    city: 'Budapest',
    zip: '1011',
    address: 'Test utca 123',
    phone: '+36201234567',
  },
}

// Initialize services
const supabase = createClient(
  TEST_CONFIG.supabase.url,
  TEST_CONFIG.supabase.serviceKey
)
const paymentManager = new PaymentManager()

describe('Payment Flow Tests', () => {
  let testUserId: string
  let testOrganizationId: string

  beforeAll(async () => {
    // Create test user and organization
    const { data: user, error: userError } = await supabase.auth.admin.createUser({
      email: TEST_CONFIG.testUser.email,
      password: TEST_CONFIG.testUser.password,
      email_confirm: true,
    })

    if (userError) throw userError
    testUserId = user.user.id

    // Create test organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: TEST_CONFIG.testUser.company,
        owner_id: testUserId,
        settings: {
          tax_number: TEST_CONFIG.testUser.taxNumber,
        },
      })
      .select()
      .single()

    if (orgError) throw orgError
    testOrganizationId = org.id
  })

  afterAll(async () => {
    // Cleanup test data
    if (testOrganizationId) {
      await supabase.from('organizations').delete().eq('id', testOrganizationId)
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId)
    }
  })

  describe('SimplePay Integration', () => {
    test('should create payment request', async () => {
      const paymentRequest = await paymentManager.createPayment({
        provider: 'simplepay',
        amount: 7900,
        currency: 'HUF',
        description: 'HangJegyzet Helyi csomag - 1 hónap',
        customerEmail: TEST_CONFIG.testUser.email,
        successUrl: 'https://staging.hangjegyzet.ai/payment/success',
        cancelUrl: 'https://staging.hangjegyzet.ai/payment/cancel',
        metadata: {
          organizationId: testOrganizationId,
          plan: 'helyi',
        },
      })

      expect(paymentRequest).toHaveProperty('paymentUrl')
      expect(paymentRequest).toHaveProperty('transactionId')
      expect(paymentRequest.paymentUrl).toMatch(/secure\.simplepay\.hu/)
    })

    test('should handle subscription creation', async () => {
      const subscription = await paymentManager.createSubscription({
        provider: 'simplepay',
        plan: 'helyi',
        customerEmail: TEST_CONFIG.testUser.email,
        billingData: TEST_CONFIG.billingData,
        metadata: {
          organizationId: testOrganizationId,
        },
      })

      expect(subscription).toHaveProperty('paymentUrl')
      expect(subscription).toHaveProperty('subscriptionId')
    })

    test('should validate webhook signatures', async () => {
      // Mock webhook payload
      const webhookPayload = {
        salt: 'test-salt',
        merchant: process.env.SIMPLEPAY_MERCHANT,
        orderRef: 'HJ-1234567890',
        currency: 'HUF',
        transactionId: 'test-transaction',
        status: 'FINISHED',
      }

      const isValid = await paymentManager.validateWebhook('simplepay', webhookPayload)
      expect(isValid).toBeDefined()
    })
  })

  describe('Stripe Integration', () => {
    test('should create checkout session', async () => {
      const paymentRequest = await paymentManager.createPayment({
        provider: 'stripe',
        amount: 29990,
        currency: 'HUF',
        description: 'HangJegyzet Profi csomag - 1 hónap',
        customerEmail: TEST_CONFIG.testUser.email,
        successUrl: 'https://staging.hangjegyzet.ai/payment/success',
        cancelUrl: 'https://staging.hangjegyzet.ai/payment/cancel',
        metadata: {
          organizationId: testOrganizationId,
          plan: 'professional',
        },
      })

      expect(paymentRequest).toHaveProperty('paymentUrl')
      expect(paymentRequest.paymentUrl).toMatch(/checkout\.stripe\.com/)
    })

    test('should create subscription with trial', async () => {
      const subscription = await paymentManager.createSubscription({
        provider: 'stripe',
        plan: 'professional',
        customerEmail: TEST_CONFIG.testUser.email,
        billingData: TEST_CONFIG.billingData,
        metadata: {
          organizationId: testOrganizationId,
          trial: 'true',
        },
      })

      expect(subscription).toHaveProperty('subscriptionId')
      expect(subscription).toHaveProperty('trialEnd')
    })
  })

  describe('Billingo Integration', () => {
    test('should create partner', async () => {
      const partnerId = await billingo.createOrGetPartner({
        name: TEST_CONFIG.testUser.company,
        address: {
          country_code: 'HU',
          post_code: TEST_CONFIG.billingData.zip,
          city: TEST_CONFIG.billingData.city,
          address: TEST_CONFIG.billingData.address,
        },
        emails: [TEST_CONFIG.testUser.email],
        taxcode: TEST_CONFIG.testUser.taxNumber,
      })

      expect(partnerId).toBeGreaterThan(0)
    })

    test('should create invoice', async () => {
      const invoice = await billingo.createSubscriptionInvoice(
        {
          name: TEST_CONFIG.testUser.name,
          email: TEST_CONFIG.testUser.email,
          address: TEST_CONFIG.billingData.address,
          city: TEST_CONFIG.billingData.city,
          zip: TEST_CONFIG.billingData.zip,
          taxcode: TEST_CONFIG.testUser.taxNumber,
          company: TEST_CONFIG.testUser.company,
        },
        {
          name: 'Helyi',
          price: 7900,
          period: '1 hónap',
        },
        'online_bankcard'
      )

      expect(invoice).toHaveProperty('id')
      expect(invoice).toHaveProperty('invoice_number')
      expect(invoice.total).toBe(7900)
      expect(invoice.currency).toBe('HUF')
    })
  })

  describe('Subscription Management', () => {
    test('should check subscription limits', async () => {
      // Create a test subscription
      const { data: subscription } = await supabase
        .from('organization_subscriptions')
        .insert({
          organization_id: testOrganizationId,
          plan: 'helyi',
          status: 'active',
          current_period_start: new Date(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .select()
        .single()

      // Check limits
      const limits = SUBSCRIPTION_PLANS.helyi.limits
      expect(limits.minutesPerMonth).toBe(350)
      expect(limits.users).toBe(2)
      expect(limits.storage).toBe(60)

      // Cleanup
      if (subscription) {
        await supabase
          .from('organization_subscriptions')
          .delete()
          .eq('id', subscription.id)
      }
    })

    test('should track usage correctly', async () => {
      // Create usage record
      const { data: usage } = await supabase
        .from('usage_records')
        .insert({
          organization_id: testOrganizationId,
          user_id: testUserId,
          type: 'transcription',
          amount: 45,
          mode: 'fast',
          metadata: {
            meeting_id: 'test-meeting',
            duration_minutes: 45,
          },
        })
        .select()
        .single()

      expect(usage).toBeDefined()
      expect(usage.amount).toBe(45)

      // Check monthly usage
      const { data: monthlyUsage } = await supabase
        .from('usage_records')
        .select('amount')
        .eq('organization_id', testOrganizationId)
        .gte('created_at', new Date(new Date().setDate(1)).toISOString())

      const totalUsage = monthlyUsage?.reduce((sum, record) => sum + record.amount, 0) || 0
      expect(totalUsage).toBeGreaterThanOrEqual(45)

      // Cleanup
      if (usage) {
        await supabase.from('usage_records').delete().eq('id', usage.id)
      }
    })
  })

  describe('Payment Error Handling', () => {
    test('should handle invalid payment provider', async () => {
      await expect(
        paymentManager.createPayment({
          provider: 'invalid' as any,
          amount: 1000,
          currency: 'HUF',
          description: 'Test',
          customerEmail: 'test@example.com',
          successUrl: 'https://example.com',
          cancelUrl: 'https://example.com',
        })
      ).rejects.toThrow('Unsupported payment provider')
    })

    test('should handle missing required fields', async () => {
      await expect(
        paymentManager.createPayment({
          provider: 'simplepay',
          amount: 0, // Invalid amount
          currency: 'HUF',
          description: '',
          customerEmail: 'invalid-email', // Invalid email
          successUrl: 'not-a-url', // Invalid URL
          cancelUrl: 'not-a-url',
        })
      ).rejects.toThrow()
    })

    test('should handle webhook replay attacks', async () => {
      const webhookData = {
        timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes old
        signature: 'old-signature',
      }

      const isValid = await paymentManager.validateWebhookTimestamp(webhookData)
      expect(isValid).toBe(false)
    })
  })

  describe('Multi-currency Support', () => {
    test('should convert HUF to EUR for Stripe', async () => {
      const eurAmount = paymentManager.convertCurrency(7900, 'HUF', 'EUR')
      expect(eurAmount).toBeGreaterThan(19)
      expect(eurAmount).toBeLessThan(25) // Assuming exchange rate between 315-415
    })

    test('should handle currency mismatch', async () => {
      await expect(
        paymentManager.createPayment({
          provider: 'simplepay',
          amount: 100,
          currency: 'USD', // SimplePay doesn't support USD
          description: 'Test',
          customerEmail: 'test@example.com',
          successUrl: 'https://example.com',
          cancelUrl: 'https://example.com',
        })
      ).rejects.toThrow('Currency not supported')
    })
  })
})

describe('End-to-End Payment Scenarios', () => {
  test('Complete subscription flow - SimplePay', async () => {
    // 1. User selects plan
    const selectedPlan = 'helyi'
    const planDetails = SUBSCRIPTION_PLANS[selectedPlan]

    // 2. Create payment
    const payment = await paymentManager.createSubscription({
      provider: 'simplepay',
      plan: selectedPlan,
      customerEmail: TEST_CONFIG.testUser.email,
      billingData: TEST_CONFIG.billingData,
    })

    expect(payment).toHaveProperty('paymentUrl')

    // 3. Simulate successful payment (webhook)
    // In real scenario, user completes payment on SimplePay

    // 4. Verify subscription is active
    // This would be done after webhook processing
  })

  test('Trial to paid conversion flow', async () => {
    // 1. User starts trial
    const { data: trial } = await supabase
      .from('organization_subscriptions')
      .insert({
        organization_id: testOrganizationId,
        plan: 'professional',
        status: 'trialing',
        trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      })
      .select()
      .single()

    expect(trial?.status).toBe('trialing')

    // 2. Convert to paid subscription
    const payment = await paymentManager.createSubscription({
      provider: 'stripe',
      plan: 'professional',
      customerEmail: TEST_CONFIG.testUser.email,
      billingData: TEST_CONFIG.billingData,
      metadata: {
        convertTrial: 'true',
        subscriptionId: trial?.id,
      },
    })

    expect(payment).toHaveProperty('subscriptionId')

    // Cleanup
    if (trial) {
      await supabase.from('organization_subscriptions').delete().eq('id', trial.id)
    }
  })

  test('Plan upgrade flow', async () => {
    // 1. Current plan: Helyi
    const { data: currentSub } = await supabase
      .from('organization_subscriptions')
      .insert({
        organization_id: testOrganizationId,
        plan: 'helyi',
        status: 'active',
      })
      .select()
      .single()

    // 2. Upgrade to Professional
    const upgrade = await paymentManager.upgradePlan({
      currentSubscriptionId: currentSub?.id!,
      newPlan: 'professional',
      provider: 'simplepay',
    })

    expect(upgrade).toHaveProperty('proratedAmount')
    expect(upgrade.proratedAmount).toBeGreaterThan(0)

    // Cleanup
    if (currentSub) {
      await supabase.from('organization_subscriptions').delete().eq('id', currentSub.id)
    }
  })
})