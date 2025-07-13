export interface BarionConfig {
  posKey: string
  payeeEmail: string
  environment: 'test' | 'prod'
}

export class BarionClient {
  private config: BarionConfig
  private baseUrl: string

  constructor(config: BarionConfig) {
    this.config = config
    this.baseUrl = config.environment === 'prod' 
      ? 'https://api.barion.com/v2'
      : 'https://api.test.barion.com/v2'
  }

  async createPayment(params: any) {
    // Placeholder implementation
    return {
      paymentId: `barion_${Date.now()}`,
      gatewayUrl: `${this.baseUrl}/pay`,
      status: 'Prepared'
    }
  }

  async getPaymentState(paymentId: string) {
    // Placeholder implementation
    return {
      paymentId,
      status: 'Prepared',
      total: 0
    }
  }

  async finishReservation(paymentId: string, transactions: any[]) {
    // Placeholder implementation
    return {
      isSuccessful: true,
      paymentId,
      status: 'Succeeded'
    }
  }

  async refund(params: any) {
    // Placeholder implementation
    return {
      paymentId: params.paymentId,
      transactionId: `refund_${Date.now()}`,
      isSuccessful: true
    }
  }
}

export function createBarionClient(config?: Partial<BarionConfig>): BarionClient {
  const finalConfig: BarionConfig = {
    posKey: config?.posKey || process.env.BARION_POS_KEY || '',
    payeeEmail: config?.payeeEmail || process.env.BARION_PAYEE_EMAIL || '',
    environment: (config?.environment || process.env.BARION_ENVIRONMENT || 'test') as 'test' | 'prod'
  }
  
  return new BarionClient(finalConfig)
}