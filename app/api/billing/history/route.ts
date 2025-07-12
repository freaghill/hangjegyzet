import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Get invoices
    const { data: invoices, error: invoiceError, count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('issue_date', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (invoiceError) {
      throw invoiceError
    }
    
    // Get payment history
    const { data: payments, error: paymentError } = await supabase
      .from('payment_history')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (paymentError) {
      console.error('Payment history error:', paymentError)
    }
    
    // Get subscription changes
    const { data: subscriptionChanges, error: subError } = await supabase
      .from('subscription_history')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (subError) {
      console.error('Subscription history error:', subError)
    }
    
    // Format response
    const billingHistory = {
      invoices: invoices || [],
      payments: payments || [],
      subscriptionChanges: subscriptionChanges || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    }
    
    return NextResponse.json(billingHistory)
  } catch (error) {
    console.error('Error fetching billing history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Generate invoice for a specific period
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { month, year } = body
    
    if (!month || !year) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization and check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    
    // Only owners and admins can generate invoices
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    // Check if invoice already exists for this period
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0)
    
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('organization_id', profile.organization_id)
      .gte('issue_date', startDate.toISOString())
      .lte('issue_date', endDate.toISOString())
      .single()
    
    if (existingInvoice) {
      return NextResponse.json({ 
        message: 'Invoice already exists for this period',
        invoice: existingInvoice 
      })
    }
    
    // TODO: Generate new invoice using Billingo API
    // For now, return a message
    return NextResponse.json({ 
      message: 'Invoice generation not implemented yet',
      todo: 'Integrate with Billingo API to generate invoice'
    })
  } catch (error) {
    console.error('Error generating invoice:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}