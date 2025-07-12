'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SearchBar } from '@/components/meetings/search-bar'
import { toast } from 'sonner'
import {
  FileAudio,
  Clock,
  Users,
  Calendar,
  ChevronRight,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  created_at: string
  duration_seconds: number
  status: string
  summary?: string
  matchedSegments: Array<{
    text: string
    speaker?: string
    timestamp?: number
    relevance: number
  }>
  relevance: number
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function MeetingsPage() {
  const searchParams = useSearchParams()
  const [meetings, setMeetings] = useState<SearchResult[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const supabase = createClient()

  const loadAllMeetings = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error, count } = await supabase
        .from('meetings')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(0, 19)

      if (error) throw error

      // Transform to search result format
      const results: SearchResult[] = (data || []).map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        created_at: meeting.created_at,
        duration_seconds: meeting.duration_seconds,
        status: meeting.status,
        summary: meeting.summary,
        matchedSegments: [],
        relevance: 0
      }))

      setMeetings(results)
      setPagination({
        page: 1,
        limit: 20,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / 20)
      })
    } catch (error) {
      console.error('Error loading meetings:', error)
      toast.error('Hiba történt a meetingek betöltése során')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const performSearch = useCallback(async () => {
    setIsSearching(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      const response = await fetch(`/api/meetings/search?${params}`)
      
      if (!response.ok) throw new Error('Search failed')
      
      const data = await response.json()
      setMeetings(data.results)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Hiba történt a keresés során')
    } finally {
      setIsSearching(false)
      setIsLoading(false)
    }
  }, [searchParams])

  // Load meetings on mount and when search params change
  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      performSearch()
    } else {
      loadAllMeetings()
    }
  }, [searchParams, performSearch, loadAllMeetings])


  const handleSearch = (_query: string, _filters: Record<string, unknown>) => {
    // The SearchBar component already updates the URL, so we just need to show loading state
    setIsSearching(true)
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}ó ${minutes}p`
    }
    return `${minutes} perc`
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={index} className="bg-yellow-200">{part}</mark>
        : part
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meetingek</h1>
        <p className="text-gray-600 mt-2">
          Keresse meg és tekintse át az összes rögzített megbeszélést
        </p>
      </div>

      {/* Search Bar */}
      <SearchBar onSearch={handleSearch} />

      {/* Results summary */}
      {searchParams.get('q') && !isLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Search className="h-4 w-4" />
          <span>
            {pagination.total} találat a(z) &quot;{searchParams.get('q')}&quot; keresésre
          </span>
        </div>
      )}

      {/* Meetings List */}
      {isLoading || isSearching ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="glass-effect">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-4" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <Card className="glass-effect">
          <CardContent className="p-12 text-center">
            <FileAudio className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">Nincs találat</p>
            <p className="text-gray-600 mt-1">
              {searchParams.get('q') 
                ? 'Próbáljon meg más keresési kifejezéseket vagy szűrőket használni'
                : 'Még nincs feltöltött meeting'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="glass-effect hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">
                        {highlightText(meeting.title, searchParams.get('q') || '')}
                      </h3>
                      <Badge
                        variant={
                          meeting.status === 'completed' ? 'default' :
                          meeting.status === 'processing' ? 'secondary' : 'destructive'
                        }
                      >
                        {meeting.status === 'completed' ? 'Kész' :
                         meeting.status === 'processing' ? 'Feldolgozás alatt' : 'Sikertelen'}
                      </Badge>
                      {meeting.relevance > 0 && (
                        <Badge variant="outline" className="ml-auto">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {meeting.relevance}% relevancia
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(meeting.created_at).toLocaleDateString('hu-HU')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(meeting.duration_seconds)}
                      </span>
                    </div>
                    
                    {meeting.summary && (
                      <p className="text-gray-700 mb-3 line-clamp-2">
                        {highlightText(meeting.summary, searchParams.get('q') || '')}
                      </p>
                    )}
                    
                    {meeting.matchedSegments.length > 0 && (
                      <div className="space-y-2 mt-3 pt-3 border-t">
                        <p className="text-sm font-medium text-gray-700">Találatok a tartalomban:</p>
                        {meeting.matchedSegments.slice(0, 2).map((segment, index) => (
                          <div key={index} className="bg-gray-50 rounded p-3 text-sm">
                            {segment.speaker && (
                              <p className="font-medium text-gray-700 mb-1">
                                <Users className="h-3 w-3 inline mr-1" />
                                {segment.speaker}:
                              </p>
                            )}
                            <p className="text-gray-600 italic">
                              &quot;...{highlightText(segment.text, searchParams.get('q') || '')}...&quot;
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <Link href={`/meetings/${meeting.id}`}>
                    <Button size="sm" variant="ghost">
                      Megnyitás
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.set('page', String(pagination.page - 1))
              window.location.search = params.toString()
            }}
          >
            Előző
          </Button>
          <span className="flex items-center px-4 text-sm">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page === pagination.totalPages}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString())
              params.set('page', String(pagination.page + 1))
              window.location.search = params.toString()
            }}
          >
            Következő
          </Button>
        </div>
      )}
    </div>
  )
}