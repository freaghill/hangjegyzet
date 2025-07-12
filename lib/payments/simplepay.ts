import crypto from 'crypto'

// SimplePay configuration
export interface SimplePayConfig {
  merchant: string
  secretKey: string
  apiUrl: string
  currency: string
  sandbox: boolean
}

// SimplePay response interface
export interface SimplePayResponse {
  e: string  // event/status
  m: string  // merchant
  o: string  // orderRef
  t: string  // transactionId
  r?: number // result code
  g?: string // group transaction ID
}

// Payment request interface
export interface PaymentRequest {
  orderRef: string
  customerEmail: string
  language: string
  total: number
  items: Array<{
    ref: string
    title: string
    amount: number
    qty: number
  }>
  invoice: {
    name: string
    company?: string
    country: string
    state?: string
    city: string
    zip: string
    address: string
    phone?: string
    taxNumber?: string
  }
  urls: {
    success: string
    fail: string
    cancel: string
    timeout: string
  }
}

// SimplePay payment data interface
interface SimplePayData {
  salt: string
  merchant: string
  orderRef: string
  currency: string
  customerEmail: string
  language: string
  sdkVersion: string
  methods: string[]
  total: number
  timeout: string
  url: string
  urlFail: string
  urlCancel: string
  urlTimeout: string
  invoice: PaymentRequest['invoice']
  items: PaymentRequest['items']
  signature?: string
}

export class SimplePay {
  private config: SimplePayConfig

  constructor(config: Partial<SimplePayConfig> = {}) {
    this.config = {
      merchant: process.env.SIMPLEPAY_MERCHANT || '',
      secretKey: process.env.SIMPLEPAY_SECRET_KEY || '',
      apiUrl: process.env.SIMPLEPAY_SANDBOX === 'true' 
        ? 'https://sandbox.simplepay.hu/payment/v2'
        : 'https://secure.simplepay.hu/payment/v2',
      currency: 'HUF',
      sandbox: process.env.SIMPLEPAY_SANDBOX === 'true',
      ...config
    }
  }

  /**
   * Create payment signature
   */
  private createSignature(data: string): string {
    return crypto
      .createHmac('sha384', this.config.secretKey)
      .update(data)
      .digest('base64')
  }

  /**
   * Generate payment request data
   */
  private generatePaymentData(request: PaymentRequest): SimplePayData {
    const timestamp = new Date().toISOString()
    
    const data = {
      salt: crypto.randomBytes(32).toString('hex'),
      merchant: this.config.merchant,
      orderRef: request.orderRef,
      currency: this.config.currency,
      customerEmail: request.customerEmail,
      language: request.language || 'HU',
      sdkVersion: 'HangJegyzet.AI SimplePay SDK v1.0.0',
      methods: ['CARD', 'WIRE'], // Bank card and wire transfer
      total: request.total,
      timeout: timestamp,
      url: request.urls.success,
      urlFail: request.urls.fail,
      urlCancel: request.urls.cancel,
      urlTimeout: request.urls.timeout,
      invoice: request.invoice,
      items: request.items,
    }

    // Create signature
    const signatureData = `${data.merchant}${data.orderRef}${data.customerEmail}${data.total}${data.currency}${timestamp}${data.salt}`
    data['signature'] = this.createSignature(signatureData)

    return data
  }

  /**
   * Start payment transaction
   */
  async startPayment(request: PaymentRequest): Promise<{
    success: boolean
    transactionId?: string
    paymentUrl?: string
    error?: string
  }> {
    try {
      const paymentData = this.generatePaymentData(request)
      
      const response = await fetch(`${this.config.apiUrl}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(paymentData),
      })

      const result = await response.json()

      if (result.errorCodes) {
        return {
          success: false,
          error: this.getErrorMessage(result.errorCodes[0]),
        }
      }

      return {
        success: true,
        transactionId: result.transactionId,
        paymentUrl: result.paymentUrl,
      }
    } catch (error) {
      console.error('SimplePay error:', error)
      return {
        success: false,
        error: 'Hiba történt a fizetés indítása során',
      }
    }
  }

  /**
   * Verify IPN (Instant Payment Notification)
   */
  verifyIPN(body: SimplePayResponse, signature: string): boolean {
    const receivedSignature = this.createSignature(JSON.stringify(body))
    return receivedSignature === signature
  }

  /**
   * Query transaction status
   */
  async queryTransaction(transactionId: string): Promise<{
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED'
    amount?: number
    currency?: string
    orderRef?: string
  }> {
    try {
      const data = {
        merchant: this.config.merchant,
        transactionId: transactionId,
        salt: crypto.randomBytes(32).toString('hex'),
      }

      const signatureData = `${data.merchant}${data.transactionId}${data.salt}`
      const signature = this.createSignature(signatureData)

      const response = await fetch(`${this.config.apiUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Signature': signature,
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()
      
      return {
        status: result.status,
        amount: result.total,
        currency: result.currency,
        orderRef: result.orderRef,
      }
    } catch (error) {
      console.error('SimplePay query error:', error)
      return { status: 'FAILED' }
    }
  }

  /**
   * Get human-readable error message
   */
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
    }

    return errors[errorCode] || `Ismeretlen hiba (${errorCode})`
  }

  /**
   * Verify redirect response signature
   */
  verifyRedirectSignature(r: string, s: string): boolean {
    try {
      // Create signature from response data
      const expectedSignature = this.createSignature(r)
      return s === expectedSignature
    } catch (error) {
      console.error('Signature verification error:', error)
      return false
    }
  }

  /**
   * Parse SimplePay redirect response
   */
  parseResponse(r: string): SimplePayResponse {
    try {
      const responseData = Buffer.from(r, 'base64').toString('utf-8')
      return JSON.parse(responseData)
    } catch (error) {
      console.error('Response parsing error:', error)
      throw new Error('Invalid response format')
    }
  }
}

// Singleton instance
export const simplePay = new SimplePay()