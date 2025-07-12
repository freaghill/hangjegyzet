'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, FileText, Users, Target, Calendar, Hash,
  Clock, TrendingUp, Filter, X, Sparkles
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useDebounce } from '@/hooks/use-debounce'
import { toast } from 'sonner'

interface SearchResult {
  id: string
  type: 'meeting' | 'action_item' | 'participant' | 'transcript_segment'
  title: string
  content: string
  metadata: any
  _formatted?: {
    title?: string
    content?: string
  }
  _highlightResult?: any
}

interface SearchFilters {
  type?: string[]
  dateRange?: { from: Date; to: Date }
  participants?: string[]
  tags?: string[]
  priority?: string[]
}

export function IntelligentSearch({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>({})
  const [facets, setFacets] = useState<any>({})
  const [activeTab, setActiveTab] = useState('all')
  
  const debouncedQuery = useDebounce(query, 300)
  const router = useRouter()
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Search when query changes
  useEffect(() => {
    if (debouncedQuery.length > 1) {
      performSearch()
    } else {
      setResults([])
      setSuggestions([])
    }
  }, [debouncedQuery, filters])

  const performSearch = async () => {
    setIsSearching(true)
    
    try {
      // Build filters
      const filterParts = []
      if (filters.type?.length) {
        filterParts.push(`type IN [${filters.type.map(t => `"${t}"`).join(', ')}]`)
      }
      if (filters.participants?.length) {
        filterParts.push(`participants IN [${filters.participants.map(p => `"${p}"`).join(', ')}]`)
      }
      if (filters.tags?.length) {
        filterParts.push(`tags IN [${filters.tags.map(t => `"${t}"`).join(', ')}]`)
      }
      
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          query: debouncedQuery,
          filters: filterParts.join(' AND '),
          facets: ['type', 'participants', 'tags', 'metadata.priority'],
          limit: 20
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setResults(data.hits || [])
        setFacets(data.facetDistribution || {})
        
        // Get suggestions for autocomplete
        if (data.hits.length > 0) {
          const suggestionResponse = await fetch('/api/search/suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              organizationId,
              query: debouncedQuery
            })
          })
          
          if (suggestionResponse.ok) {
            const suggestionsData = await suggestionResponse.json()
            setSuggestions(suggestionsData.suggestions || [])
          }
        }
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Keresés sikertelen')
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    
    switch (result.type) {
      case 'meeting':
        router.push(`/meetings/${result.metadata.meetingId || result.id.replace('meeting_', '')}`)
        break
      case 'action_item':
        router.push(`/meetings/${result.metadata.meetingId}#action-${result.id}`)
        break
      case 'transcript_segment':
        router.push(`/meetings/${result.metadata.meetingId}#segment-${result.metadata.startTime}`)
        break
    }
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <FileText className="w-4 h-4" />
      case 'action_item': return <Target className="w-4 h-4" />
      case 'participant': return <Users className="w-4 h-4" />
      case 'transcript_segment': return <Hash className="w-4 h-4" />
      default: return <Search className="w-4 h-4" />
    }
  }

  const getResultSubtitle = (result: SearchResult) => {
    switch (result.type) {
      case 'meeting':
        return `${new Date(result.metadata.timestamp).toLocaleDateString('hu')} • ${Math.round(result.metadata.duration / 60)}p`
      case 'action_item':
        return `${result.metadata.assignee || 'Nincs felelős'} • ${result.metadata.priority || 'normal'} prioritás`
      case 'transcript_segment':
        return `${result.metadata.speaker} • ${result.metadata.meetingTitle}`
      default:
        return ''
    }
  }

  const clearFilters = () => {
    setFilters({})
  }

  const toggleFilter = (filterType: keyof SearchFilters, value: string) => {
    setFilters(prev => {
      const current = prev[filterType] as string[] || []
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      
      return {
        ...prev,
        [filterType]: updated.length > 0 ? updated : undefined
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        className="relative w-full justify-start text-sm text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        Intelligens keresés...
        <kbd className="pointer-events-none absolute right-2 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0">
          <Command className="rounded-lg border-none">
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Keresés meetingekben, feladatokban, résztvevőkben..."
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
              {isSearching && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              )}
            </div>
            
            {/* Filters */}
            {Object.keys(facets).length > 0 && (
              <div className="border-b p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">Szűrők</span>
                  {Object.keys(filters).length > 0 && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={clearFilters}
                      className="h-5 px-2 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Törlés
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {facets.type && Object.entries(facets.type).map(([type, count]) => (
                    <Badge
                      key={type}
                      variant={filters.type?.includes(type) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleFilter('type', type)}
                    >
                      {getResultIcon(type)}
                      <span className="ml-1">{type} ({count})</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Suggestions */}
            {suggestions.length > 0 && query.length > 0 && (
              <div className="border-b p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Javaslatok</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((suggestion, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setQuery(suggestion.text)}
                    >
                      <Sparkles className="w-3 h-3 mr-1" />
                      <span dangerouslySetInnerHTML={{ __html: suggestion.highlighted }} />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <CommandList>
              <ScrollArea className="h-[400px]">
                {query.length === 0 ? (
                  <div className="p-8 text-center">
                    <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Kezdjen el gépelni a kereséshez
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                      <Badge variant="outline" className="cursor-pointer" onClick={() => setQuery('action items')}>
                        <Target className="w-3 h-3 mr-1" />
                        Akció pontok
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer" onClick={() => setQuery('summary')}>
                        <FileText className="w-3 h-3 mr-1" />
                        Összefoglalók
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer" onClick={() => setQuery('decision')}>
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Döntések
                      </Badge>
                    </div>
                  </div>
                ) : results.length === 0 && !isSearching ? (
                  <CommandEmpty>
                    <div className="p-8 text-center">
                      <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Nincs találat a következőre: "{query}"
                      </p>
                    </div>
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {results.map((result) => (
                      <CommandItem
                        key={result.id}
                        value={result.id}
                        onSelect={() => handleSelect(result)}
                        className="p-3"
                      >
                        <div className="flex items-start gap-3 w-full">
                          <div className="mt-0.5">
                            {getResultIcon(result.type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="font-medium">
                              {result._formatted?.title ? (
                                <span dangerouslySetInnerHTML={{ __html: result._formatted.title }} />
                              ) : (
                                result.title
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getResultSubtitle(result)}
                            </div>
                            {result._formatted?.content && (
                              <div 
                                className="text-sm text-muted-foreground line-clamp-2"
                                dangerouslySetInnerHTML={{ __html: result._formatted.content }}
                              />
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </ScrollArea>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}