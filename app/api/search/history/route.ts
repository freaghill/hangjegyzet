import { NextRequest, NextResponse } from 'next/server'
import { SearchService } from '@/lib/search/search-service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const searchService = new SearchService()
    const history = await searchService.getSearchHistory(limit)
    
    return NextResponse.json({ history })
  } catch (error) {
    console.error('Search history error:', error)
    return NextResponse.json(
      { error: 'Failed to get search history' },
      { status: 500 }
    )
  }
}