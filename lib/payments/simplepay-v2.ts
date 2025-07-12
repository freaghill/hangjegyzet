import crypto from 'crypto'
import { 
  PaymentInitRequest, 
  PaymentInitResponse,
  PaymentStatusResponse,
  RefundRequest,
  RefundResponse,
  PaymentProvider 
} from './types'

export class SimplePayService implements PaymentProvider {
  private merchant: string
  private secretKey: string
  private apiUrl: string
  private isLive: boolean

  constructor() {
    this.merchant = process.env.SIMPLEPAY_MERCHANT_ID || ''
    this.secretKey = process.env.SIMPLEPAY_SECRET_KEY || ''
    this.isLive = process.env.SIMPLEPAY_LIVE_MODE === 'true'
    this.apiUrl = this.isLive 
      ? 'https://secure.simplepay.hu/payment/v2'
      : 'https://sandbox.simplepay.hu/payment/v2'
      
    if (!this.merchant || !this.secretKey) {
      throw new Error('SimplePay configuration missing')
    }
  }

  async initializePayment(request: PaymentInitRequest): Promise<PaymentInitResponse> {
    try {
      const timestamp = new Date().toISOString()
      const salt = crypto.randomBytes(32).toString('hex')
      
      const paymentData = {
        salt,
        merchant: this.merchant,
        orderRef: request.orderId,
        currency: request.currency || 'EUR',
        customerEmail: request.customerEmail || '',
        language: 'HU',
        sdkVersion: 'HangJegyzet SimplePay SDK v1.0',
        methods: ['CARD'],
        total: Math.round(request.amount), // SimplePay expects integer
        timeout: timestamp,
        url: request.returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/success`,
        urlFail: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/fail`,
        urlCancel: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/cancel`,
        urlTimeout: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/timeout`,
        invoice: {
          name: request.customerName || request.customerEmail || 'Customer',
          country: 'HU',
          city: 'N/A',
          zip: '0000',
          address: 'N/A',
        },
        items: [{
          ref: request.productId || 'HANGJEGYZET_SUB',
          title: request.description || 'HangJegyzet.AI Előfizetés',
          amount: Math.round(request.amount),
          qty: 1
        }]
      }

      // Create signature
      const signatureString = [
        paymentData.merchant,
        paymentData.orderRef,
        paymentData.customerEmail,
        paymentData.total,
        paymentData.currency,
        timestamp,
        salt
      ].join('')
      
      const signature = this.createSignature(signatureString)
      
      const response = await fetch(`${this.apiUrl}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Signature': signature
        },
        body: JSON.stringify(paymentData)
      })

      const result = await response.json()

      if (result.errorCodes && result.errorCodes.length > 0) {
        throw new Error(this.getErrorMessage(result.errorCodes[0]))
      }

      return {
        success: true,
        paymentId: result.paymentId,
        transactionId: result.transactionId,
        gatewayUrl: result.paymentUrl,
        orderId: request.orderId
      }
    } catch (error) {
      console.error('SimplePay payment init error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment initialization failed'
      }
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      const salt = crypto.randomBytes(32).toString('hex')
      const signatureString = `${this.merchant}${paymentId}${salt}`
      const signature = this.createSignature(signatureString)

      const response = await fetch(`${this.apiUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Signature': signature
        },
        body: JSON.stringify({
          merchant: this.merchant,
          transactionId: paymentId,
          salt
        })
      })

      const result = await response.json()

      return {
        success: true,
        status: this.mapSimplePayStatus(result.status),
        paymentId: result.transactionId,
        amount: result.total,
        currency: result.currency,
        completedAt: result.finishDate ? new Date(result.finishDate) : undefined
      }
    } catch (error) {
      console.error('SimplePay status error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment status'
      }
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResponse> {
    try {
      const salt = crypto.randomBytes(32).toString('hex')
      const signatureString = `${this.merchant}${request.paymentId}${request.amount}${salt}`
      const signature = this.createSignature(signatureString)

      const response = await fetch(`${this.apiUrl}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Signature': signature
        },
        body: JSON.stringify({
          merchant: this.merchant,
          transactionId: request.paymentId,
          amount: Math.round(request.amount),
          salt
        })
      })

      const result = await response.json()

      if (result.errorCodes && result.errorCodes.length > 0) {
        throw new Error(this.getErrorMessage(result.errorCodes[0]))
      }

      return {
        success: true,
        refundId: result.refundTransactionId,
        refundedAmount: request.amount,
        status: 'completed'
      }
    } catch (error) {
      console.error('SimplePay refund error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed'
      }
    }
  }

  validateWebhook(payload: any, signature: string): boolean {
    try {
      const expectedSignature = this.createSignature(JSON.stringify(payload))
      return signature === expectedSignature
    } catch (error) {
      console.error('Webhook validation error:', error)
      return false
    }
  }

  private createSignature(data: string): string {
    return crypto
      .createHmac('sha384', this.secretKey)
      .update(data)
      .digest('base64')
  }

  private mapSimplePayStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'INIT': 'pending',
      'IN_PAYMENT': 'processing',
      'SUCCESS': 'completed',
      'FAIL': 'failed',
      'CANCEL': 'cancelled',
      'TIMEOUT': 'expired',
      'IN_REFUND': 'processing',
      'REFUND': 'refunded'
    }
    
    return statusMap[status] || 'unknown'
  }

  private getErrorMessage(errorCode: number): string {
    const errors: Record<number, string> = {
      1001: 'Hiányzó kötelező mező',
      1002: 'Hibás mezőérték',
      1003: 'Hibás aláírás',
      1004: 'Ismeretlen kereskedő',
      1005: 'Lejárt tranzakció',
      1006: 'Duplikált tranzakció',
      1007: 'Érvénytelen összeg',
      1008: 'Érvénytelen pénznem',
      1009: 'Technikai hiba',
      1010: 'Kártya elutasítva',
      1101: 'Sikertelen 3DS hitelesítés',
      1102: 'Kártya lejárt',
      1103: 'Nem elegendő fedezet',
      1104: 'Limit túllépés',
      1105: 'Tiltott kártya'
    }

    return errors[errorCode] || `Ismeretlen hiba (${errorCode})`
  }

  parseRedirectResponse(r: string): any {
    try {
      const decoded = Buffer.from(r, 'base64').toString('utf-8')
      return JSON.parse(decoded)
    } catch (error) {
      console.error('Response parsing error:', error)
      throw new Error('Invalid response format')
    }
  }
}

// Singleton instance
let simplePayInstance: SimplePayService | null = null

export function getSimplePayService(): SimplePayService {
  if (!simplePayInstance) {
    simplePayInstance = new SimplePayService()
  }
  return simplePayInstance
}