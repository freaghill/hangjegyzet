export interface BillingoConfig {
  apiKey: string
  blockId: string
  environment?: 'live' | 'sandbox'
}

export interface BillingoInvoice {
  id?: string
  invoice_number?: string
  partner: {
    name: string
    address: {
      country_code: string
      post_code: string
      city: string
      address: string
    }
    emails: string[]
    taxcode?: string
  }
  items: Array<{
    name: string
    unit_price: number
    unit_price_type: 'gross' | 'net'
    quantity: number
    unit: string
    vat: string
    comment?: string
  }>
  payment_method: string
  currency: string
  due_date: string
  fulfillment_date: string
  language: string
  settings: {
    mediated_service: boolean
    without_financial_fulfillment: boolean
  }
}

export class BillingoClient {
  private config: BillingoConfig
  private baseUrl: string

  constructor(config: BillingoConfig) {
    this.config = config
    this.baseUrl = config.environment === 'live' 
      ? 'https://api.billingo.hu/v3'
      : 'https://api.billingo.hu/v3' // Same for both environments
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-API-KEY': this.config.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Billingo API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async createInvoice(invoice: BillingoInvoice) {
    return this.request('/documents', {
      method: 'POST',
      body: JSON.stringify({
        ...invoice,
        block_id: parseInt(this.config.blockId),
      }),
    })
  }

  async getInvoice(id: string) {
    return this.request(`/documents/${id}`)
  }

  async sendInvoice(id: string) {
    return this.request(`/documents/${id}/send`, {
      method: 'POST',
    })
  }

  async downloadInvoice(id: string) {
    return this.request(`/documents/${id}/download`)
  }

  async cancelInvoice(id: string) {
    return this.request(`/documents/${id}/cancel`, {
      method: 'POST',
    })
  }

  async createPartner(partner: any) {
    return this.request('/partners', {
      method: 'POST',
      body: JSON.stringify(partner),
    })
  }

  async getPartner(id: string) {
    return this.request(`/partners/${id}`)
  }
}

export function createBillingoClient(config?: Partial<BillingoConfig>): BillingoClient {
  const finalConfig: BillingoConfig = {
    apiKey: config?.apiKey || process.env.BILLINGO_API_KEY || '',
    blockId: config?.blockId || process.env.BILLINGO_BLOCK_ID || '',
    environment: config?.environment || 'sandbox'
  }
  
  return new BillingoClient(finalConfig)
}