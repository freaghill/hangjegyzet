import { PaymentService } from '@/lib/payment/payment-service'
import { BarionClient } from '@/lib/payment/barion-client'
import { createClient } from '@supabase/supabase-js'
import { EmailService } from '@/lib/email/email-service'
import { mockSuccessResponse, mockErrorResponse } from '@/__tests__/test-utils'

jest.mock('@/lib/payment/barion-client')
jest.mock('@supabase/supabase-js')
jest.mock('@/lib/email/email-service')

describe('PaymentService', () => {
  let paymentService: PaymentService
  let mockBarionClient: jest.Mocked<BarionClient>
  let mockSupabaseClient: any
  let mockEmailService: jest.Mocked<EmailService>

  beforeEach(() => {
    mockBarionClient = {
      createPayment: jest.fn(),
      getPaymentStatus: jest.fn(),
      refundPayment: jest.fn(),
    } as any

    mockSupabaseClient = {
      from: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      })),
    }

    mockEmailService = {
      sendPaymentReceipt: jest.fn(),
      queue: jest.fn(),
    } as any

    ;(BarionClient as jest.Mock).mockImplementation(() => mockBarionClient)
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
    ;(EmailService as jest.Mock).mockImplementation(() => mockEmailService)

    paymentService = new PaymentService()
  })

  describe('createPayment', () => {
    it('should create payment successfully', async () => {
      const paymentData = {
        userId: 'test-user-id',
        planId: 'pro-monthly',
        amount: 9990,
        currency: 'HUF' as const,
        userEmail: 'test@example.com',
        userName: 'Test User',
        callbackUrl: 'https://example.com/callback',
        redirectUrl: 'https://example.com/success',
      }

      const mockBarionResponse = {
        paymentId: 'barion-payment-id',
        paymentRequestId: 'request-id',
        status: 'Prepared',
        qrUrl: 'https://barion.com/qr/12345',
        redirectUrl: 'https://barion.com/pay/12345',
        transactions: [{
          transactionId: 'txn-id',
          status: 'Prepared',
          total: 9990,
        }],
      }

      mockBarionClient.createPayment.mockResolvedValue({
        success: true,
        payment: mockBarionResponse,
        error: null,
      })

      mockSupabaseClient.from().insert().single.mockResolvedValue(
        mockSuccessResponse({ id: 'payment-id' })
      )

      const result = await paymentService.createPayment(paymentData)

      expect(mockBarionClient.createPayment).toHaveBeenCalledWith({
        paymentType: 'Immediate',
        reservationPeriod: '00:30:00',
        paymentWindow: '00:30:00',
        guestCheckout: true,
        fundingSources: ['All'],
        paymentRequestId: expect.any(String),
        orderNumber: expect.any(String),
        redirectUrl: paymentData.redirectUrl,
        callbackUrl: paymentData.callbackUrl,
        locale: 'hu-HU',
        currency: 'HUF',
        transactions: [{
          posTransactionId: expect.any(String),
          payee: expect.any(String),
          total: 9990,
          items: [{
            name: expect.stringContaining('Pro'),
            description: expect.any(String),
            quantity: 1,
            unit: 'db',
            unitPrice: 9990,
            itemTotal: 9990,
          }],
        }],
      })

      expect(result.paymentId).toBe('payment-id')
      expect(result.redirectUrl).toBe(mockBarionResponse.redirectUrl)
      expect(result.error).toBeNull()
    })

    it('should handle invalid plan', async () => {
      const paymentData = {
        userId: 'test-user-id',
        planId: 'invalid-plan',
        amount: 9990,
        currency: 'HUF' as const,
        userEmail: 'test@example.com',
        userName: 'Test User',
        callbackUrl: 'https://example.com/callback',
        redirectUrl: 'https://example.com/success',
      }

      const result = await paymentService.createPayment(paymentData)

      expect(result.paymentId).toBeNull()
      expect(result.error).toContain('Invalid plan')
      expect(mockBarionClient.createPayment).not.toHaveBeenCalled()
    })

    it('should handle Barion API errors', async () => {
      const paymentData = {
        userId: 'test-user-id',
        planId: 'pro-monthly',
        amount: 9990,
        currency: 'HUF' as const,
        userEmail: 'test@example.com',
        userName: 'Test User',
        callbackUrl: 'https://example.com/callback',
        redirectUrl: 'https://example.com/success',
      }

      mockBarionClient.createPayment.mockResolvedValue({
        success: false,
        payment: null,
        error: 'Payment provider error',
      })

      const result = await paymentService.createPayment(paymentData)

      expect(result.paymentId).toBeNull()
      expect(result.error).toBe('Payment provider error')
    })
  })

  describe('processPaymentCallback', () => {
    it('should process successful payment callback', async () => {
      const callbackData = {
        paymentId: 'barion-payment-id',
        paymentRequestId: 'request-id',
        status: 'Succeeded',
      }

      const mockPayment = {
        id: 'payment-id',
        user_id: 'test-user-id',
        plan_id: 'pro-monthly',
        amount: 9990,
        user_email: 'test@example.com',
        user_name: 'Test User',
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse(mockPayment)
      )

      mockBarionClient.getPaymentStatus.mockResolvedValue({
        payment: {
          status: 'Succeeded',
          completedAt: new Date().toISOString(),
          total: 9990,
        },
        error: null,
      })

      mockSupabaseClient.from().update().eq().mockResolvedValue(
        mockSuccessResponse(null)
      )

      mockSupabaseClient.from().insert().mockResolvedValue(
        mockSuccessResponse(null)
      )

      mockEmailService.sendPaymentReceipt.mockResolvedValue({
        status: 'sent',
        messageId: 'msg-id',
        timestamp: new Date(),
        events: [],
      })

      const result = await paymentService.processPaymentCallback(callbackData)

      expect(result.success).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('payments')
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'completed',
        completed_at: expect.any(String),
        updated_at: expect.any(String),
      })
      expect(mockEmailService.sendPaymentReceipt).toHaveBeenCalled()
    })

    it('should handle failed payment callback', async () => {
      const callbackData = {
        paymentId: 'barion-payment-id',
        paymentRequestId: 'request-id',
        status: 'Failed',
      }

      const mockPayment = {
        id: 'payment-id',
        user_id: 'test-user-id',
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse(mockPayment)
      )

      mockBarionClient.getPaymentStatus.mockResolvedValue({
        payment: {
          status: 'Failed',
          errors: ['Insufficient funds'],
        },
        error: null,
      })

      mockSupabaseClient.from().update().eq().mockResolvedValue(
        mockSuccessResponse(null)
      )

      const result = await paymentService.processPaymentCallback(callbackData)

      expect(result.success).toBe(false)
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'failed',
        error: expect.stringContaining('Insufficient funds'),
        updated_at: expect.any(String),
      })
      expect(mockEmailService.sendPaymentReceipt).not.toHaveBeenCalled()
    })
  })

  describe('createSubscription', () => {
    it('should create subscription after successful payment', async () => {
      const userId = 'test-user-id'
      const planId = 'pro-monthly'
      const paymentId = 'payment-id'

      const plan = paymentService.getPlans().find(p => p.id === planId)!
      const startDate = new Date()
      const endDate = new Date()
      endDate.setMonth(endDate.getMonth() + 1)

      mockSupabaseClient.from().insert().single.mockResolvedValue(
        mockSuccessResponse({
          id: 'subscription-id',
          user_id: userId,
          plan_id: planId,
          status: 'active',
        })
      )

      const result = await paymentService.createSubscription(userId, planId, paymentId)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscriptions')
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        current_period_start: expect.any(String),
        current_period_end: expect.any(String),
        payment_id: paymentId,
        features: plan.features,
      })
      expect(result.subscriptionId).toBe('subscription-id')
      expect(result.error).toBeNull()
    })

    it('should handle subscription creation errors', async () => {
      const userId = 'test-user-id'
      const planId = 'pro-monthly'
      const paymentId = 'payment-id'

      mockSupabaseClient.from().insert().single.mockResolvedValue(
        mockErrorResponse('Duplicate subscription')
      )

      const result = await paymentService.createSubscription(userId, planId, paymentId)

      expect(result.subscriptionId).toBeNull()
      expect(result.error).toBe('Duplicate subscription')
    })
  })

  describe('refundPayment', () => {
    it('should process refund successfully', async () => {
      const paymentId = 'payment-id'
      const reason = 'Customer request'

      const mockPayment = {
        id: paymentId,
        barion_payment_id: 'barion-payment-id',
        amount: 9990,
        status: 'completed',
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse(mockPayment)
      )

      mockBarionClient.refundPayment.mockResolvedValue({
        success: true,
        refundId: 'refund-id',
        error: null,
      })

      mockSupabaseClient.from().update().eq().mockResolvedValue(
        mockSuccessResponse(null)
      )

      mockSupabaseClient.from().insert().single.mockResolvedValue(
        mockSuccessResponse({ id: 'refund-record-id' })
      )

      const result = await paymentService.refundPayment(paymentId, reason)

      expect(mockBarionClient.refundPayment).toHaveBeenCalledWith({
        paymentId: 'barion-payment-id',
        transactionsToRefund: [{
          transactionId: expect.any(String),
          amountToRefund: 9990,
        }],
        comment: reason,
      })
      expect(result.refundId).toBe('refund-record-id')
      expect(result.error).toBeNull()
    })

    it('should handle refund errors', async () => {
      const paymentId = 'payment-id'
      const reason = 'Customer request'

      const mockPayment = {
        id: paymentId,
        barion_payment_id: 'barion-payment-id',
        amount: 9990,
        status: 'completed',
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse(mockPayment)
      )

      mockBarionClient.refundPayment.mockResolvedValue({
        success: false,
        refundId: null,
        error: 'Refund not allowed',
      })

      const result = await paymentService.refundPayment(paymentId, reason)

      expect(result.refundId).toBeNull()
      expect(result.error).toBe('Refund not allowed')
    })

    it('should validate payment status before refund', async () => {
      const paymentId = 'payment-id'
      const reason = 'Customer request'

      const mockPayment = {
        id: paymentId,
        barion_payment_id: 'barion-payment-id',
        amount: 9990,
        status: 'pending', // Not completed
      }

      mockSupabaseClient.from().select().eq().single.mockResolvedValue(
        mockSuccessResponse(mockPayment)
      )

      const result = await paymentService.refundPayment(paymentId, reason)

      expect(result.refundId).toBeNull()
      expect(result.error).toContain('Only completed payments can be refunded')
      expect(mockBarionClient.refundPayment).not.toHaveBeenCalled()
    })
  })

  describe('getPlans', () => {
    it('should return all available plans', () => {
      const plans = paymentService.getPlans()

      expect(plans).toHaveLength(3)
      expect(plans.map(p => p.id)).toEqual(['basic-monthly', 'pro-monthly', 'pro-yearly'])
      
      const proMonthly = plans.find(p => p.id === 'pro-monthly')
      expect(proMonthly).toMatchObject({
        name: 'Pro - Havi',
        price: 9990,
        currency: 'HUF',
        interval: 'month',
        features: expect.objectContaining({
          meetings_per_month: -1, // unlimited
          transcription_minutes: -1,
          max_file_size_mb: 2048,
          team_members: 10,
        }),
      })
    })
  })

  describe('getUserSubscription', () => {
    it('should return active user subscription', async () => {
      const userId = 'test-user-id'
      const mockSubscription = {
        id: 'subscription-id',
        user_id: userId,
        plan_id: 'pro-monthly',
        status: 'active',
        current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }

      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue(
        mockSuccessResponse(mockSubscription)
      )

      const result = await paymentService.getUserSubscription(userId)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscriptions')
      expect(result.subscription).toEqual(mockSubscription)
      expect(result.error).toBeNull()
    })

    it('should return null for users without subscription', async () => {
      const userId = 'test-user-id'

      mockSupabaseClient.from().select().eq().eq().single.mockResolvedValue(
        mockErrorResponse('No subscription found')
      )

      const result = await paymentService.getUserSubscription(userId)

      expect(result.subscription).toBeNull()
      expect(result.error).toBeNull() // No error for missing subscription
    })
  })
})