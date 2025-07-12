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
    const role = searchParams.get('role') || ''
    
    let query = supabase
      .from('profiles')
      .select(`
        *,
        organizations (
          id,
          name,
          subscription_tier,
          subscription_ends_at
        )
      `, { count: 'exact' })
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,organizations.name.ilike.%${search}%`)
    }
    
    if (role && role !== 'all') {
      query = query.eq('role', role)
    }
    
    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    return NextResponse.json({
      users: data,
      total: count,
      page,
      limit
    })
  } catch (error) {
    console.error('Admin users API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await checkAdminAuth()
    const supabase = await createClient()
    
    const { userId, updates } = await request.json()
    
    // Validate updates
    const allowedFields = ['role', 'name']
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {} as any)
    
    const { data, error } = await supabase
      .from('profiles')
      .update(filteredUpdates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ user: data })
  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}