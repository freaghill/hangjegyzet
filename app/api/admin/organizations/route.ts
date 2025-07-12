import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/admin/auth'

export async function GET(request: NextRequest) {
  try {
    await checkAdminAuth()
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const search = searchParams.get('search') || ''
    const tier = searchParams.get('tier') || ''
    
    let query = supabase
      .from('organizations')
      .select(`
        *,
        profiles!inner (
          id
        ),
        usage_stats (
          minutes_used,
          meetings_count
        )
      `, { count: 'exact' })
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`)
    }
    
    if (tier && tier !== 'all') {
      query = query.eq('subscription_tier', tier)
    }
    
    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json({
      organizations: data,
      total: count,
      page,
      limit
    })
  } catch (error) {
    console.error('Admin organizations API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await checkAdminAuth()
    const supabase = await createClient()
    
    const { organizationId, updates } = await request.json()
    
    // Validate updates
    const allowedFields = ['name', 'subscription_tier', 'subscription_ends_at', 'settings', 'billing_data']
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {} as any)
    
    const { data, error } = await supabase
      .from('organizations')
      .update(filteredUpdates)
      .eq('id', organizationId)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ organization: data })
  } catch (error) {
    console.error('Admin organization update error:', error)
    return NextResponse.json(
      { error: 'Failed to update organization' },
      { status: 500 }
    )
  }
}