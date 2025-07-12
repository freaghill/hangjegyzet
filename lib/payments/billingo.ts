interface BillingoConfig {
  apiKey: string
  blockId: string
  apiUrl: string
}

interface BillingoPartner {
  name: string
  address: {
    country_code: string
    post_code: string
    city: string
    address: string
  }
  emails: string[]
  taxcode?: string // Adószám
  iban?: string
  swift?: string
  account_number?: string
  phone?: string
}

interface BillingoInvoiceItem {
  name: string
  unit_price: number
  unit_price_type: 'gross' | 'net'
  quantity: number
  unit: string
  vat: string // 'AAM' for alanyi adómentes
  comment?: string
}

interface BillingoInvoice {
  partner_id?: number
  partner?: BillingoPartner
  block_id: number
  type: 'invoice' | 'proforma' | 'draft'
  fulfillment_date: string
  due_date: string
  payment_method: 'aruhitel' | 'bankcard' | 'barion' | 'barter' | 'cash' | 'cod' | 'coupon' | 'elore_utalas' | 'ep_kartya' | 'kompenzacio' | 'levonas' | 'online_bankcard' | 'otp_simple' | 'paylike' | 'payoneer' | 'paypal' | 'paypal_utolag' | 'payu' | 'pick_pack_pont' | 'postai_csekk' | 'postautalvany' | 'skrill' | 'szep_kartya' | 'transferwise' | 'upwork' | 'utalas' | 'utalvany' | 'valto' | 'western_union' | 'other'
  language: 'hu' | 'en' | 'de' | 'fr' | 'es' | 'it' | 'ro' | 'sk' | 'hr'
  currency: string
  conversion_rate?: number
  electronic?: boolean
  comment?: string
  settings: {
    mediated_servicxe?: boolean
    without_financial_fulfillment?: boolean
    online_payment_url?: string
    should_send_email?: boolean
    round?: 'none' | 'one' | 'five' | 'ten'
    place_id?: number
  }
  items: BillingoInvoiceItem[]
}

export class Billingo {
  private config: BillingoConfig

  constructor(config?: Partial<BillingoConfig>) {
    this.config = {
      apiKey: process.env.BILLINGO_API_KEY || '',
      blockId: process.env.BILLINGO_BLOCK_ID || '',
      apiUrl: 'https://api.billingo.hu/v3',
      ...config
    }
  }

  /**
   * Create or get partner (customer)
   */
  async createOrGetPartner(partner: BillingoPartner): Promise<number> {
    try {
      // First, try to find existing partner by tax number or email
      if (partner.taxcode) {
        const existingPartner = await this.searchPartner(partner.taxcode)
        if (existingPartner) {
          return existingPartner.id
        }
      }

      // Create new partner
      const response = await fetch(`${this.config.apiUrl}/partners`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partner),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Partner létrehozása sikertelen')
      }

      const result = await response.json()
      return result.id
    } catch (error) {
      console.error('Billingo partner error:', error)
      throw error
    }
  }

  /**
   * Search for partner by tax number
   */
  private async searchPartner(taxcode: string): Promise<{ id: number } | null> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/partners?query=${encodeURIComponent(taxcode)}`,
        {
          headers: {
            'X-API-KEY': this.config.apiKey,
          },
        }
      )

      if (!response.ok) {
        return null
      }

      const partners = await response.json()
      return partners.data.find((p: { id: number; taxcode?: string }) => p.taxcode === taxcode) || null
    } catch (error) {
      return null
    }
  }

  /**
   * Create invoice
   */
  async createInvoice(
    invoice: Omit<BillingoInvoice, 'block_id'>
  ): Promise<{
    id: number
    invoice_number: string
    total: number
    total_paid: number
    currency: string
    partner_id: number
  }> {
    try {
      const invoiceData: BillingoInvoice = {
        ...invoice,
        block_id: parseInt(this.config.blockId),
        type: invoice.type || 'invoice',
        language: invoice.language || 'hu',
        currency: invoice.currency || 'HUF',
        electronic: invoice.electronic !== false,
        settings: {
          ...invoice.settings,
          should_send_email: invoice.settings?.should_send_email !== false,
          round: invoice.settings?.round || 'one',
        },
      }

      const response = await fetch(`${this.config.apiUrl}/documents`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Számla létrehozása sikertelen')
      }

      const result = await response.json()
      return {
        id: result.id,
        invoice_number: result.invoice_number,
        total: result.total,
        total_paid: result.total_paid,
        currency: result.currency,
        partner_id: result.partner.id,
      }
    } catch (error) {
      console.error('Billingo invoice error:', error)
      throw error
    }
  }

  /**
   * Download invoice as PDF
   */
  async downloadInvoice(invoiceId: number): Promise<Buffer> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/documents/${invoiceId}/download`,
        {
          headers: {
            'X-API-KEY': this.config.apiKey,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Számla letöltése sikertelen')
      }

      const buffer = await response.arrayBuffer()
      return Buffer.from(buffer)
    } catch (error) {
      console.error('Billingo download error:', error)
      throw error
    }
  }

  /**
   * Send invoice via email
   */
  async sendInvoice(invoiceId: number, emails?: string[]): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/documents/${invoiceId}/send`,
        {
          method: 'POST',
          headers: {
            'X-API-KEY': this.config.apiKey,
            'Content-Type': 'application/json',
          },
          body: emails ? JSON.stringify({ emails }) : undefined,
        }
      )

      if (!response.ok) {
        throw new Error('Számla küldése sikertelen')
      }
    } catch (error) {
      console.error('Billingo send error:', error)
      throw error
    }
  }

  /**
   * Create HangJegyzet subscription invoice
   */
  async createSubscriptionInvoice(
    customerData: {
      name: string
      email: string
      address: string
      city: string
      zip: string
      taxcode?: string
      company?: string
    },
    plan: {
      name: string
      price: number // Alanyi adómentes - no VAT
      period: string
    },
    paymentMethod: string = 'online_bankcard'
  ) {
    // Create or get partner
    const partner: BillingoPartner = {
      name: customerData.company || customerData.name,
      address: {
        country_code: 'HU',
        post_code: customerData.zip,
        city: customerData.city,
        address: customerData.address,
      },
      emails: [customerData.email],
      taxcode: customerData.taxcode,
    }

    const partnerId = await this.createOrGetPartner(partner)

    // Create invoice
    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + 8) // 8 days payment term

    const invoice = await this.createInvoice({
      partner_id: partnerId,
      type: 'invoice',
      fulfillment_date: today.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      payment_method: paymentMethod as BillingoInvoice['payment_method'],
      currency: 'HUF',
      comment: `HangJegyzet.AI ${plan.name} előfizetés - ${plan.period}`,
      items: [
        {
          name: `HangJegyzet.AI ${plan.name} előfizetés (${plan.period})`,
          unit_price: plan.price,
          unit_price_type: 'gross', // Alanyi adómentes - gross = net
          quantity: 1,
          unit: 'db',
          vat: 'AAM', // Alanyi adómentes
          comment: 'Alanyi adómentes - ÁFA tv. 193. §',
        },
      ],
      settings: {
        should_send_email: true,
        round: 'one',
      },
    })

    return invoice
  }
}

export const billingo = new Billingo()