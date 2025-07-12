import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/admin/auth'
import BillingManagementClient from '@/components/admin/billing-management-client'

export default async function BillingPage() {
  await checkAdminAuth()
  const supabase = await createClient()
  
  // Get recent invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      organizations (
        name,
        subscription_tier
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)
  
  // Get recent payments
  const { data: payments } = await supabase
    .from('payment_history')
    .select(`
      *,
      organizations (
        name
      ),
      invoices (
        invoice_number
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50)
  
  // Get subscription intents
  const { data: intents } = await supabase
    .from('subscription_intents')
    .select(`
      *,
      organizations (
        name
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  
  // Calculate revenue metrics
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)
  
  const { data: monthlyRevenue } = await supabase
    .from('invoices')
    .select('gross_amount')
    .eq('status', 'paid')
    .gte('issue_date', currentMonth.toISOString())
  
  const totalMonthlyRevenue = monthlyRevenue?.reduce((sum, inv) => sum + (inv.gross_amount || 0), 0) || 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Billing Management</h1>
        <p className="text-gray-600 mt-2">Manage invoices, payments, and subscriptions</p>
      </div>

      <BillingManagementClient
        invoices={invoices || []}
        payments={payments || []}
        pendingIntents={intents || []}
        monthlyRevenue={totalMonthlyRevenue}
      />
    </div>
  )
}