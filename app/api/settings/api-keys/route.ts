import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

// GET - List all API keys for the organization
export async function GET() {
  try {
    const supabase = await createClient()
    
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
    
    // Get API keys (only show partial key for security)
    const { data: apiKeys, error } = await supabase
      .from('api_keys')
      .select('id, name, description, created_at, last_used_at, expires_at, is_active')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ apiKeys: apiKeys || [] })
  } catch (error) {
    console.error('Error fetching API keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { name, description, expiresIn } = body
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    
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
    
    // Only owners and admins can create API keys
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    // Generate API key
    const apiKey = `hj_${randomBytes(32).toString('hex')}`
    const keyHash = Buffer.from(apiKey).toString('base64') // In production, use proper hashing
    
    // Calculate expiry date
    let expiresAt = null
    if (expiresIn) {
      const expiryDate = new Date()
      switch (expiresIn) {
        case '30d':
          expiryDate.setDate(expiryDate.getDate() + 30)
          break
        case '90d':
          expiryDate.setDate(expiryDate.getDate() + 90)
          break
        case '1y':
          expiryDate.setFullYear(expiryDate.getFullYear() + 1)
          break
      }
      expiresAt = expiryDate.toISOString()
    }
    
    // Store API key
    const { data: newKey, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: profile.organization_id,
        name,
        description,
        key_hash: keyHash,
        expires_at: expiresAt,
        created_by: user.id
      })
      .select('id, name, created_at')
      .single()
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ 
      apiKey: {
        ...newKey,
        key: apiKey // Only return the full key on creation
      }
    })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')
    
    if (!keyId) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 })
    }
    
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
    
    // Only owners and admins can delete API keys
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    // Delete the API key
    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', keyId)
      .eq('organization_id', profile.organization_id)
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}