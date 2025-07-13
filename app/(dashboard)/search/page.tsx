'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { AdvancedSearch } from '@/components/search/advanced-search'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  FileText, 
  Clock, 
  Users, 
  TrendingUp,
  Search as SearchIcon,
  ChevronRight
} from 'lucide-react'
import { SearchResult, SearchFilters } from '@/lib/search/types'
import { formatDistanceToNow } from 'date-fns'
import { hu } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function SearchPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [searchTime, setSearchTime] = useState(0)
  const [currentQuery, setCurrentQuery] = useState('')

  const performSearch = useCallback(async (query: string, filters: SearchFilters) => {
    setIsLoading(true)
    setCurrentQuery(query)

    try {
      const params = new URLSearchParams()
      params.set('q', query)
      
      if (filters.dateFrom) {
        params.set('dateFrom', filters.dateFrom.toISOString())
      }
      if (filters.dateTo) {
        params.set('dateTo', filters.dateTo.toISOString())
      }
      if (filters.speakers?.length) {
        params.set('speakers', filters.speakers.join(','))
      }
      if (filters.tags?.length) {
        params.set('tags', filters.tags.join(','))
      }

      const response = await fetch(`/api/search?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setResults(data.results || [])
      setTotal(data.total || 0)
      setSearchTime(data.took || 0)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Hiba történt a keresés során')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial search from URL params
  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      const filters: SearchFilters = {}
      
      const dateFrom = searchParams.get('dateFrom')
      if (dateFrom) filters.dateFrom = new Date(dateFrom)
      
      const dateTo = searchParams.get('dateTo')
      if (dateTo) filters.dateTo = new Date(dateTo)
      
      const speakers = searchParams.get('speakers')
      if (speakers) filters.speakers = speakers.split(',')
      
      const tags = searchParams.get('tags')
      if (tags) filters.tags = tags.split(',')

      performSearch(query, filters)
    }
  }, [searchParams, performSearch])

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} perc`
  }

  const highlightMatch = (text: string, highlight: string) => {
    // Remove HTML tags from highlight
    const cleanHighlight = highlight.replace(/<[^>]*>/g, '')
    return (
      <span dangerouslySetInnerHTML={{ 
        __html: highlight || text 
      }} />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Keresés</h1>
        <p className="text-gray-600 mt-2">
          Keressen a meetingek átírásában és jegyzeteiben
        </p>
      </div>

      {/* Search Bar */}
      <AdvancedSearch onSearch={performSearch} />

      {/* Results */}
      {currentQuery && (
        <>
          {/* Results Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>
                {total} találat "{currentQuery}" kifejezésre
              </span>
              <span className="text-gray-400">
                ({searchTime}ms)
              </span>
            </div>
            {!isLoading && results.length > 0 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Relevancia szerint rendezve</span>
              </div>
            )}
          </div>

          {/* Results List */}
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result) => (
                <Card 
                  key={result.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/meetings/${result.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-2">
                          {result.title}
                        </h3>
                        
                        {/* Highlighted snippet */}
                        <p className="text-gray-700 mb-3 line-clamp-2">
                          {highlightMatch(
                            result.summary || '', 
                            result.headline
                          )}
                        </p>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatDuration(result.duration_seconds)}
                          </span>
                          {result.speakers && result.speakers.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {result.speakers.length} beszélő
                            </span>
                          )}
                          <span>
                            {formatDistanceToNow(new Date(result.created_at), { 
                              addSuffix: true,
                              locale: hu 
                            })}
                          </span>
                        </div>

                        {/* Tags */}
                        {result.tags && result.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-3">
                            {result.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Relevance Score */}
                      <div className="ml-4 text-right">
                        <div className="text-sm text-gray-500">Relevancia</div>
                        <div className="text-2xl font-bold text-blue-600">
                          {Math.round(result.relevance * 100)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <SearchIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">
                  Nincs találat a keresési feltételeknek megfelelően
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Próbáljon más keresési kifejezést vagy módosítsa a szűrőket
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}