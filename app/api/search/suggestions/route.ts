import { NextRequest, NextResponse } from 'next/server'
import { SearchService } from '@/lib/search/search-service'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q') || ''
    
    const searchService = new SearchService()
    const suggestions = await searchService.getSuggestions(query)
    
    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    )
  }
}