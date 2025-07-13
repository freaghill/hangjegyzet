import { createClient } from '@/lib/supabase/server'
import { Billingo } from './billingo'
import { getSubscriptionPlan } from './subscription-plans'
import type { Organization, Payment } from '@/types/database'

export interface InvoiceData {
  invoiceId: string
  invoiceNumber: string
  pdfUrl?: string
  amount: number
  currency: string
  issuedAt: Date
  dueDate: Date
  status: 'draft' | 'sent' | 'paid' | 'canceled'
}

export interface InvoiceCreateParams {
  paymentId: string
  organizationId: string
  type: 'subscription' | 'one_time' | 'credit_pack'
  metadata?: Record<string, any>
}

export class InvoiceService {
  private billingo: Billingo

  constructor() {
    this.billingo = new Billingo()
  }

  /**
   * Create invoice for payment
   */
  async createInvoice(params: InvoiceCreateParams): Promise<InvoiceData> {
    const { paymentId, organizationId, type, metadata } = params
    const supabase = await createClient()

    // Get payment details
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single()

    if (!payment) {
      throw new Error('Payment not found')
    }

    // Get organization details
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (!organization) {
      throw new Error('Organization not found')
    }

    // Create invoice based on type
    let invoice: any
    switch (type) {
      case 'subscription':
        invoice = await this.createSubscriptionInvoice(payment, organization)
        break
      case 'one_time':
        invoice = await this.createOneTimeInvoice(payment, organization)
        break
      case 'credit_pack':
        invoice = await this.createCreditPackInvoice(payment, organization)
        break
      default:
        throw new Error('Invalid invoice type')
    }

    // Store invoice in database
    const { data: storedInvoice } = await supabase
      .from('invoices')
      .insert({
        organization_id: organizationId,
        payment_id: paymentId,
        billingo_id: invoice.id,
        invoice_number: invoice.invoice_number,
        amount: invoice.total,
        currency: invoice.currency,
        status: 'sent',
        issued_at: new Date().toISOString(),
        due_date: invoice.due_date,
        type,
        metadata: {
          ...metadata,
          billingo_response: invoice,
        },
      })
      .select()
      .single()

    // Send invoice via email
    await this.billingo.sendInvoice(invoice.id)

    return {
      invoiceId: storedInvoice!.id,
      invoiceNumber: invoice.invoice_number,
      amount: invoice.total,
      currency: invoice.currency,
      issuedAt: new Date(),
      dueDate: new Date(invoice.due_date),
      status: 'sent',
    }
  }

  /**
   * Create subscription invoice
   */
  private async createSubscriptionInvoice(payment: any, organization: any) {
    const plan = getSubscriptionPlan(payment.metadata?.planId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    const customerData = {
      name: organization.name,
      email: organization.billing_email || organization.contact_email,
      address: organization.address || 'N/A',
      city: organization.city || 'Budapest',
      zip: organization.postal_code || '1111',
      taxcode: organization.tax_number,
      company: organization.name,
    }

    const planData = {
      name: plan.name,
      price: payment.amount,
      period: `${plan.duration} nap`,
    }

    const paymentMethod = this.mapPaymentMethod(payment.provider)
    
    return await this.billingo.createSubscriptionInvoice(
      customerData,
      planData,
      paymentMethod
    )
  }

  /**
   * Create one-time invoice
   */
  private async createOneTimeInvoice(payment: any, organization: any) {
    const partnerId = await this.getOrCreatePartner(organization)

    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + 8)

    return await this.billingo.createInvoice({
      partner_id: partnerId,
      type: 'invoice',
      fulfillment_date: today.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      payment_method: this.mapPaymentMethod(payment.provider),
      currency: payment.currency,
      comment: payment.description || 'HangJegyzet.AI szolgáltatás',
      items: [{
        name: payment.description || 'HangJegyzet.AI kredit',
        unit_price: payment.amount,
        unit_price_type: 'gross',
        quantity: 1,
        unit: 'db',
        vat: this.getVatRate(organization),
        comment: this.getVatComment(organization),
      }],
      settings: {
        should_send_email: true,
        round: 'one',
      },
    })
  }

  /**
   * Create credit pack invoice
   */
  private async createCreditPackInvoice(payment: any, organization: any) {
    const credits = payment.metadata?.credits || 0
    const partnerId = await this.getOrCreatePartner(organization)

    const today = new Date()
    const dueDate = new Date(today)
    dueDate.setDate(dueDate.getDate() + 8)

    return await this.billingo.createInvoice({
      partner_id: partnerId,
      type: 'invoice',
      fulfillment_date: today.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      payment_method: this.mapPaymentMethod(payment.provider),
      currency: payment.currency,
      comment: `HangJegyzet.AI kredit csomag - ${credits} kredit`,
      items: [{
        name: `Kredit csomag (${credits} kredit)`,
        unit_price: payment.amount,
        unit_price_type: 'gross',
        quantity: 1,
        unit: 'csomag',
        vat: this.getVatRate(organization),
        comment: this.getVatComment(organization),
      }],
      settings: {
        should_send_email: true,
        round: 'one',
      },
    })
  }

  /**
   * Get or create partner in Billingo
   */
  private async getOrCreatePartner(organization: any): Promise<number> {
    const partner = {
      name: organization.name,
      address: {
        country_code: organization.country || 'HU',
        post_code: organization.postal_code || '1111',
        city: organization.city || 'Budapest',
        address: organization.address || 'N/A',
      },
      emails: [organization.billing_email || organization.contact_email],
      taxcode: organization.tax_number,
      phone: organization.phone,
    }

    return await this.billingo.createOrGetPartner(partner)
  }

  /**
   * Get VAT rate based on organization
   */
  private getVatRate(organization: any): string {
    // Check if organization is tax exempt
    if (organization.tax_status === 'alanyi_adomentes') {
      return 'AAM'
    }
    
    // EU VAT for non-Hungarian EU companies
    if (organization.country !== 'HU' && this.isEuCountry(organization.country)) {
      return 'EU'
    }
    
    // Standard Hungarian VAT
    return '27%'
  }

  /**
   * Get VAT comment
   */
  private getVatComment(organization: any): string {
    if (organization.tax_status === 'alanyi_adomentes') {
      return 'Alanyi adómentes - ÁFA tv. XIII/A. fejezet'
    }
    
    if (organization.country !== 'HU' && this.isEuCountry(organization.country)) {
      return 'Reverse charge - VAT Act Section 142'
    }
    
    return ''
  }

  /**
   * Map payment provider to Billingo payment method
   */
  private mapPaymentMethod(provider: string): string {
    switch (provider) {
      case 'simplepay':
        return 'online_bankcard'
      case 'barion':
        return 'barion'
      case 'stripe':
        return 'online_bankcard'
      case 'bank_transfer':
        return 'utalas'
      default:
        return 'other'
    }
  }

  /**
   * Check if country is in EU
   */
  private isEuCountry(countryCode: string): boolean {
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
    ]
    return euCountries.includes(countryCode)
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoice(invoiceId: string): Promise<Buffer> {
    const supabase = await createClient()

    // Get invoice from database
    const { data: invoice } = await supabase
      .from('invoices')
      .select('billingo_id')
      .eq('id', invoiceId)
      .single()

    if (!invoice || !invoice.billingo_id) {
      throw new Error('Invoice not found')
    }

    return await this.billingo.downloadInvoice(invoice.billingo_id)
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(invoiceId: string): Promise<void> {
    const supabase = await createClient()

    // Update invoice status
    await supabase
      .from('invoices')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    // Note: Billingo doesn't support canceling sent invoices
    // You need to create a credit note (storno) instead
  }

  /**
   * Create monthly invoice summary
   */
  async createMonthlySummary(organizationId: string, month: string): Promise<{
    totalAmount: number
    invoiceCount: number
    invoices: InvoiceData[]
  }> {
    const supabase = await createClient()

    const startDate = new Date(`${month}-01`)
    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + 1)

    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('issued_at', startDate.toISOString())
      .lt('issued_at', endDate.toISOString())
      .order('issued_at', { ascending: false })

    const totalAmount = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0
    
    return {
      totalAmount,
      invoiceCount: invoices?.length || 0,
      invoices: invoices?.map(inv => ({
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        pdfUrl: inv.pdf_url,
        amount: inv.amount,
        currency: inv.currency,
        issuedAt: new Date(inv.issued_at),
        dueDate: new Date(inv.due_date),
        status: inv.status,
      })) || [],
    }
  }

  /**
   * Send invoice reminder
   */
  async sendInvoiceReminder(invoiceId: string): Promise<void> {
    const supabase = await createClient()

    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, organizations(*)')
      .eq('id', invoiceId)
      .single()

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    // Send reminder via Billingo
    if (invoice.billingo_id) {
      await this.billingo.sendInvoice(invoice.billingo_id)
    }

    // Update reminder sent date
    await supabase
      .from('invoices')
      .update({
        last_reminder_sent: new Date().toISOString(),
        reminder_count: (invoice.reminder_count || 0) + 1,
      })
      .eq('id', invoiceId)
  }
}

export const invoiceService = new InvoiceService()