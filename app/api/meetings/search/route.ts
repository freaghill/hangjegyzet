import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchService, SearchFilters } from '@/lib/search/contextual-search'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 403 }
      )
    }
    
    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit
    
    // Parse filters
    const filters: SearchFilters = {}
    
    if (searchParams.get('dateFrom')) {
      filters.dateFrom = searchParams.get('dateFrom')!
    }
    if (searchParams.get('dateTo')) {
      filters.dateTo = searchParams.get('dateTo')!
    }
    if (searchParams.get('speaker')) {
      filters.speaker = searchParams.get('speaker')!
    }
    if (searchParams.get('minDuration')) {
      filters.minDuration = parseInt(searchParams.get('minDuration')!)
    }
    if (searchParams.get('maxDuration')) {
      filters.maxDuration = parseInt(searchParams.get('maxDuration')!)
    }
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status') as 'completed' | 'processing' | 'failed'
    }
    
    // Perform search
    const { results, total } = await searchService.searchMeetings(
      profile.organization_id,
      query,
      filters,
      limit,
      offset
    )
    
    // Return paginated response
    return NextResponse.json({
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}

// Get available speakers for filtering
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    
    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 403 }
      )
    }
    
    const body = await request.json()
    
    if (body.action === 'getSpeakers') {
      const speakers = await searchService.getSpeakers(profile.organization_id)
      return NextResponse.json({ speakers })
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Request failed' },
      { status: 500 }
    )
  }
}