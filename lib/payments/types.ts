// Common payment types for all payment providers

export interface PaymentInitRequest {
  orderId: string
  amount: number
  currency?: string
  description?: string
  productId?: string
  customerEmail?: string
  customerName?: string
  customerPhone?: string
  returnUrl?: string
  callbackUrl?: string
  metadata?: Record<string, any>
}

export interface PaymentInitResponse {
  success: boolean
  paymentId?: string
  gatewayUrl?: string
  transactionId?: string
  orderId?: string
  error?: string
}

export interface PaymentStatusResponse {
  success: boolean
  status?: string
  paymentId?: string
  transactionId?: string
  amount?: number
  currency?: string
  completedAt?: Date
  error?: string
  transactions?: Array<{
    transactionId: string
    status: string
    amount: number
  }>
}

export interface RefundRequest {
  paymentId: string
  transactionId?: string
  amount: number
  reason?: string
}

export interface RefundResponse {
  success: boolean
  refundId?: string
  refundedAmount?: number
  status?: string
  error?: string
}

export interface WebhookPayload {
  provider: 'barion' | 'simplepay' | 'stripe'
  eventType: string
  paymentId: string
  transactionId?: string
  status: string
  amount?: number
  currency?: string
  timestamp: string
  signature?: string
  rawData: any
}

export interface PaymentProvider {
  initializePayment(request: PaymentInitRequest): Promise<PaymentInitResponse>
  getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse>
  refundPayment(request: RefundRequest): Promise<RefundResponse>
  validateWebhook?(payload: any, signature: string): boolean
}

export type PaymentStatus = 
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partial'
  | 'expired'
  | 'unknown'

export interface SubscriptionPayment {
  id: string
  userId: string
  subscriptionId: string
  amount: number
  currency: string
  status: PaymentStatus
  provider: 'barion' | 'simplepay'
  paymentId: string
  transactionId?: string
  createdAt: Date
  completedAt?: Date
  metadata?: Record<string, any>
}