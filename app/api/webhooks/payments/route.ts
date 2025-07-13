import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SimplePayClient } from '@/lib/payments/providers/simplepay/client'
import { BarionClient } from '@/lib/payments/providers/barion/client'
import { subscriptionManager } from '@/lib/payments/subscription-manager'
import { auditLogger } from '@/lib/security/audit-logger'
import crypto from 'crypto'

// Webhook signature verification
function verifySimplePaySignature(body: string, signature: string): boolean {
  const secretKey = process.env.SIMPLEPAY_SECRET_KEY!
  const expectedSignature = crypto
    .createHmac('sha384', secretKey)
    .update(body)
    .digest('base64')
  
  return signature === expectedSignature
}

function verifyBarionSignature(paymentId: string): boolean {
  // Barion doesn't use signatures, but we can verify the payment ID exists
  return !!paymentId
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  
  try {
    // Get provider from header or query param
    const provider = request.headers.get('x-payment-provider') || 
                    request.nextUrl.searchParams.get('provider')
    
    if (!provider) {
      return NextResponse.json({ error: 'Provider not specified' }, { status: 400 })
    }

    const body = await request.text()
    
    // Handle SimplePay webhook
    if (provider === 'simplepay') {
      const signature = request.headers.get('signature')
      if (!signature || !verifySimplePaySignature(body, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }

      const data = JSON.parse(body)
      await handleSimplePayWebhook(data, supabase)
    }
    
    // Handle Barion webhook
    else if (provider === 'barion') {
      const data = JSON.parse(body)
      if (!data.PaymentId || !verifyBarionSignature(data.PaymentId)) {
        return NextResponse.json({ error: 'Invalid payment ID' }, { status: 401 })
      }

      await handleBarionWebhook(data, supabase)
    }
    
    else {
      return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    
    // Log webhook error
    await auditLogger.log({
      action: 'webhook.error',
      resource_type: 'payment',
      status: 'failure',
      metadata: {
        provider: request.headers.get('x-payment-provider'),
        error: error.message,
      },
    })
    
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle SimplePay webhook
 */
async function handleSimplePayWebhook(data: any, supabase: any) {
  const { transactionId, orderRef, status, paymentStatus } = data

  // Log webhook
  await auditLogger.log({
    action: 'webhook.received',
    resource_type: 'payment',
    resource_id: transactionId,
    metadata: {
      provider: 'simplepay',
      status,
      paymentStatus,
      orderRef,
    },
  })

  // Get payment record
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('provider_reference', transactionId)
    .single()

  if (error || !payment) {
    // Check if it's a registration
    if (orderRef?.startsWith('REG-')) {
      await handleCardRegistration(data, supabase)
      return
    }
    
    console.error('Payment not found:', transactionId)
    return
  }

  // Update payment status
  const newStatus = mapSimplePayStatus(status, paymentStatus)
  
  await supabase
    .from('payments')
    .update({
      status: newStatus,
      provider_status: status,
      updated_at: new Date().toISOString(),
      provider_response: data,
    })
    .eq('id', payment.id)

  // Handle successful payment
  if (newStatus === 'succeeded') {
    await handleSuccessfulPayment(payment, supabase)
  }
  
  // Handle failed payment
  else if (newStatus === 'failed') {
    await handleFailedPayment(payment, supabase)
  }
}

/**
 * Handle Barion webhook
 */
async function handleBarionWebhook(data: any, supabase: any) {
  const { PaymentId } = data
  
  // Get payment details from Barion
  const barionClient = new BarionClient(
    process.env.BARION_POS_KEY!,
    process.env.NODE_ENV === 'production'
  )
  
  const paymentDetails = await barionClient.getPaymentState(PaymentId)
  
  // Log webhook
  await auditLogger.log({
    action: 'webhook.received',
    resource_type: 'payment',
    resource_id: PaymentId,
    metadata: {
      provider: 'barion',
      status: paymentDetails.Status,
    },
  })

  // Get payment record
  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('provider_reference', PaymentId)
    .single()

  if (error || !payment) {
    console.error('Payment not found:', PaymentId)
    return
  }

  // Update payment status
  const newStatus = mapBarionStatus(paymentDetails.Status)
  
  await supabase
    .from('payments')
    .update({
      status: newStatus,
      provider_status: paymentDetails.Status,
      updated_at: new Date().toISOString(),
      provider_response: paymentDetails,
    })
    .eq('id', payment.id)

  // Handle successful payment
  if (newStatus === 'succeeded') {
    await handleSuccessfulPayment(payment, supabase)
  }
  
  // Handle failed payment
  else if (newStatus === 'failed' || newStatus === 'canceled') {
    await handleFailedPayment(payment, supabase)
  }
}

/**
 * Handle successful payment
 */
async function handleSuccessfulPayment(payment: any, supabase: any) {
  // Check if already processed
  if (payment.status === 'succeeded') {
    return
  }

  // Update organization credits if one-time payment
  if (payment.type === 'one_time') {
    const { data: organization } = await supabase
      .from('organizations')
      .select('credits')
      .eq('id', payment.organization_id)
      .single()

    if (organization) {
      await supabase
        .from('organizations')
        .update({
          credits: (organization.credits || 0) + (payment.metadata?.credits || 0),
        })
        .eq('id', payment.organization_id)
    }
  }
  
  // Handle subscription payment
  else if (payment.metadata?.subscriptionId) {
    await subscriptionManager.handlePaymentSuccess(payment.id)
  }

  // Send confirmation email
  await sendPaymentConfirmationEmail(payment, supabase)
  
  // Log success
  await auditLogger.log({
    action: 'payment.succeeded',
    resource_type: 'payment',
    resource_id: payment.id,
    organization_id: payment.organization_id,
    metadata: {
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
    },
  })
}

/**
 * Handle failed payment
 */
async function handleFailedPayment(payment: any, supabase: any) {
  // Update subscription if applicable
  if (payment.metadata?.subscriptionId) {
    await supabase
      .from('subscriptions')
      .update({
        status: 'past_due',
        last_failed_payment: new Date().toISOString(),
      })
      .eq('id', payment.metadata.subscriptionId)
  }

  // Send failure notification
  await sendPaymentFailedEmail(payment, supabase)
  
  // Log failure
  await auditLogger.log({
    action: 'payment.failed',
    resource_type: 'payment',
    resource_id: payment.id,
    organization_id: payment.organization_id,
    status: 'failure',
    metadata: {
      amount: payment.amount,
      currency: payment.currency,
      provider: payment.provider,
      reason: payment.provider_response?.error,
    },
  })
}

/**
 * Handle card registration (SimplePay)
 */
async function handleCardRegistration(data: any, supabase: any) {
  const { transactionId, orderRef, status, cardData } = data
  
  if (status !== 'FINISHED' || !cardData) {
    return
  }

  // Extract customer ID from order ref
  const match = orderRef.match(/REG-\d+-(.+)/)
  const customerId = match?.[1]
  
  if (!customerId) {
    console.error('Invalid registration order ref:', orderRef)
    return
  }

  // Store card registration
  await supabase
    .from('payment_methods')
    .insert({
      customer_id: customerId,
      organization_id: data.metadata?.organizationId,
      provider: 'simplepay',
      type: 'card',
      provider_reference: cardData.registrationId,
      last4: cardData.maskedCard?.slice(-4),
      expiry_month: cardData.expiry?.split('/')[0],
      expiry_year: cardData.expiry?.split('/')[1],
      card_brand: cardData.cardType,
      is_default: true, // Make it default if first card
      active: true,
    })

  // Log registration
  await auditLogger.log({
    action: 'card.registered',
    resource_type: 'payment_method',
    metadata: {
      provider: 'simplepay',
      customerId,
      maskedCard: cardData.maskedCard,
    },
  })
}

/**
 * Map SimplePay status to our status
 */
function mapSimplePayStatus(status: string, paymentStatus?: string): string {
  if (status === 'FINISHED' && paymentStatus === 'AUTHORIZED') {
    return 'succeeded'
  } else if (status === 'FINISHED') {
    return 'succeeded'
  } else if (status === 'CANCELLED' || status === 'TIMEOUT') {
    return 'canceled'
  } else if (status === 'FAILED') {
    return 'failed'
  } else {
    return 'pending'
  }
}

/**
 * Map Barion status to our status
 */
function mapBarionStatus(status: string): string {
  switch (status) {
    case 'Succeeded':
    case 'Completed':
      return 'succeeded'
    case 'Failed':
    case 'Rejected':
      return 'failed'
    case 'Canceled':
    case 'Expired':
      return 'canceled'
    case 'Refunded':
      return 'refunded'
    case 'PartiallyRefunded':
      return 'partially_refunded'
    default:
      return 'pending'
  }
}

/**
 * Send payment confirmation email
 */
async function sendPaymentConfirmationEmail(payment: any, supabase: any) {
  const { data: organization } = await supabase
    .from('organizations')
    .select('name, billing_email, contact_email')
    .eq('id', payment.organization_id)
    .single()

  if (!organization) return

  const email = organization.billing_email || organization.contact_email
  
  // TODO: Implement email sending
  console.log('Sending payment confirmation to:', email)
}

/**
 * Send payment failed email
 */
async function sendPaymentFailedEmail(payment: any, supabase: any) {
  const { data: organization } = await supabase
    .from('organizations')
    .select('name, billing_email, contact_email')
    .eq('id', payment.organization_id)
    .single()

  if (!organization) return

  const email = organization.billing_email || organization.contact_email
  
  // TODO: Implement email sending
  console.log('Sending payment failed notification to:', email)
}