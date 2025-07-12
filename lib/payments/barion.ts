import { Barion } from 'node-barion'
import { 
  PaymentInitRequest, 
  PaymentInitResponse,
  PaymentStatusResponse,
  RefundRequest,
  RefundResponse 
} from './types'

export class BarionPaymentService {
  private barion: Barion
  private posKey: string
  private pixelId: string | null
  
  constructor() {
    const shopId = process.env.BARION_SHOP_ID
    const apiKey = process.env.BARION_API_KEY
    const isLive = process.env.BARION_LIVE_MODE === 'true'
    
    if (!shopId || !apiKey) {
      throw new Error('Barion configuration missing')
    }
    
    this.posKey = shopId
    this.barion = new Barion({
      POSKey: shopId,
      Environment: isLive ? 'Prod' : 'Test',
      FundingSources: ['All'],
      GuestCheckOut: true,
      Locale: 'hu-HU',
      Currency: 'EUR'
    })
    
    this.pixelId = process.env.BARION_PIXEL_ID || null
  }

  async initializePayment(request: PaymentInitRequest): Promise<PaymentInitResponse> {
    try {
      const barionRequest = {
        PaymentType: 'Immediate',
        ReservationPeriod: 30, // 30 minutes
        PaymentWindow: 30, // 30 minutes
        GuestCheckOut: true,
        FundingSources: ['All'],
        Currency: 'EUR',
        Locale: 'hu-HU',
        OrderNumber: request.orderId,
        PaymentRequestId: `${request.orderId}-${Date.now()}`,
        RedirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/barion/callback?success=true`,
        CallbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/barion/webhook`,
        Transactions: [
          {
            POSTransactionId: request.orderId,
            Payee: this.posKey,
            Total: request.amount,
            Items: [
              {
                Name: request.description || 'HangJegyzet.AI Előfizetés',
                Description: request.description || 'AI-alapú meeting jegyzetelési szolgáltatás',
                Quantity: 1,
                Unit: 'db',
                UnitPrice: request.amount,
                ItemTotal: request.amount,
                SKU: request.productId || 'HANGJEGYZET_SUB'
              }
            ]
          }
        ],
        ShippingAddress: request.customerEmail ? {
          Country: 'HU',
          City: 'N/A',
          Region: 'N/A', 
          Street: 'N/A',
          Street2: '',
          Street3: '',
          Zip: '0000',
          FullName: request.customerName || request.customerEmail
        } : undefined,
        PayerPhoneNumber: request.customerPhone,
        PayerWorkPhoneNumber: '',
        PayerHomePhoneNumber: ''
      }

      const response = await this.barion.startPayment(barionRequest)

      if (response.Errors && response.Errors.length > 0) {
        throw new Error(response.Errors[0].Description)
      }

      return {
        success: true,
        paymentId: response.PaymentId,
        gatewayUrl: response.GatewayUrl,
        transactionId: response.Transactions[0].TransactionId,
        orderId: request.orderId
      }
    } catch (error) {
      console.error('Barion payment initialization error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment initialization failed'
      }
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await this.barion.getPaymentState({ PaymentId: paymentId })

      if (response.Errors && response.Errors.length > 0) {
        throw new Error(response.Errors[0].Description)
      }

      return {
        success: true,
        status: this.mapBarionStatus(response.Status),
        paymentId: response.PaymentId,
        amount: response.Total,
        currency: response.Currency,
        completedAt: response.CompletedAt ? new Date(response.CompletedAt) : undefined,
        transactions: response.Transactions.map((tx: any) => ({
          transactionId: tx.TransactionId,
          status: tx.Status,
          amount: tx.Total
        }))
      }
    } catch (error) {
      console.error('Barion payment status error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment status'
      }
    }
  }

  async refundPayment(request: RefundRequest): Promise<RefundResponse> {
    try {
      const refundRequest = {
        PaymentId: request.paymentId,
        TransactionsToRefund: [
          {
            TransactionId: request.transactionId,
            AmountToRefund: request.amount,
            Comment: request.reason || 'Visszatérítés'
          }
        ]
      }

      const response = await this.barion.refundPayment(refundRequest)

      if (response.Errors && response.Errors.length > 0) {
        throw new Error(response.Errors[0].Description)
      }

      return {
        success: true,
        refundId: response.PaymentId,
        refundedAmount: request.amount,
        status: 'completed'
      }
    } catch (error) {
      console.error('Barion refund error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund failed'
      }
    }
  }

  async capturePayment(paymentId: string): Promise<any> {
    try {
      const response = await this.barion.capturePayment({
        PaymentId: paymentId,
        Transactions: []
      })

      if (response.Errors && response.Errors.length > 0) {
        throw new Error(response.Errors[0].Description)
      }

      return {
        success: true,
        paymentId: response.PaymentId,
        status: response.Status
      }
    } catch (error) {
      console.error('Barion capture error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Capture failed'
      }
    }
  }

  getPixelId(): string | null {
    return this.pixelId
  }

  private mapBarionStatus(barionStatus: string): string {
    const statusMap: Record<string, string> = {
      'Prepared': 'pending',
      'Started': 'processing',
      'InProgress': 'processing',
      'Reserved': 'authorized',
      'Captured': 'completed',
      'Succeeded': 'completed',
      'Failed': 'failed',
      'PartiallySucceeded': 'partial',
      'Expired': 'expired',
      'Canceled': 'cancelled'
    }
    
    return statusMap[barionStatus] || 'unknown'
  }

  // Helper method to generate Barion Pixel tracking code
  generatePixelScript(): string | null {
    if (!this.pixelId) return null
    
    return `
      <!-- Barion Pixel -->
      <script>
        (function(i,s,o,g,r,a,m){i['BarionAnalyticsObject']=r;i[r]=i[r]||function(){
        (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
        m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
        })(window,document,'script','https://pixel.barion.com/bp.js','bp');
        
        bp('init', '${this.pixelId}');
        bp('send', 'contentView');
      </script>
      <!-- End Barion Pixel -->
    `
  }
}

// Singleton instance
let barionInstance: BarionPaymentService | null = null

export function getBarionService(): BarionPaymentService {
  if (!barionInstance) {
    barionInstance = new BarionPaymentService()
  }
  return barionInstance
}