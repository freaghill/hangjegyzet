import { NextRequest, NextResponse } from 'next/server'
import { getBarionService } from '@/lib/payments/barion'
import { createClient } from '@supabase/supabase-js'
import { emailService } from '@/lib/email/sendgrid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()
    console.log('Barion webhook received:', payload)

    // Get payment status from Barion
    const barionService = getBarionService()
    const paymentStatus = await barionService.getPaymentStatus(payload.PaymentId)

    if (!paymentStatus.success) {
      console.error('Failed to get payment status:', paymentStatus.error)
      return NextResponse.json({ error: 'Failed to get payment status' }, { status: 400 })
    }

    // Update payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_id', payload.PaymentId)
      .single()

    if (paymentError) {
      console.error('Payment not found:', paymentError)
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        status: paymentStatus.status,
        transaction_id: paymentStatus.transactions?.[0]?.transactionId,
        completed_at: paymentStatus.completedAt,
        updated_at: new Date().toISOString()
      })
      .eq('payment_id', payload.PaymentId)

    if (updateError) {
      console.error('Failed to update payment:', updateError)
      return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
    }

    // Handle successful payment
    if (paymentStatus.status === 'completed' && payment.metadata?.type === 'subscription') {
      // Update user subscription
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: payment.user_id,
          plan_id: payment.metadata.planId,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })

      if (subError) {
        console.error('Failed to update subscription:', subError)
      }

      // Send confirmation email
      const { data: user } = await supabase
        .from('profiles')
        .select('email, name')
        .eq('id', payment.user_id)
        .single()

      if (user) {
        await emailService.sendEmail({
          to: user.email,
          subject: 'Sikeres előfizetés - HangJegyzet.AI',
          html: `
            <h2>Köszönjük előfizetését!</h2>
            <p>Kedves ${user.name || 'Felhasználó'}!</p>
            <p>Sikeresen előfizetett a HangJegyzet.AI ${payment.metadata.planId} csomagra.</p>
            <p>Az előfizetés részletei:</p>
            <ul>
              <li>Csomag: ${payment.metadata.planId}</li>
              <li>Összeg: ${paymentStatus.amount} ${paymentStatus.currency}</li>
              <li>Következő számlázás: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('hu-HU')}</li>
            </ul>
            <p>Kérdése van? Írjon nekünk: support@hangjegyzet.ai</p>
          `
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}