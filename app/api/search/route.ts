import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { meilisearchService } from '@/lib/search/meilisearch-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { organizationId, query, filters, facets, limit, offset, sort } = body
    
    // Verify user has access to organization
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .single()
    
    if (!member) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Perform search
    const results = await meilisearchService.search(organizationId, {
      query,
      filters,
      facets,
      limit,
      offset,
      sort,
      highlightPreTag: '<mark>',
      highlightPostTag: '</mark>',
      attributesToHighlight: ['title', 'content'],
      attributesToCrop: ['content'],
      cropLength: 200
    })
    
    return NextResponse.json(results)
    
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    )
  }
}