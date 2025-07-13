'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { 
  Search, 
  X, 
  Calendar as CalendarIcon, 
  Users, 
  Tags,
  History,
  TrendingUp,
  Loader2
} from 'lucide-react'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { SearchFilters } from '@/lib/search/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AdvancedSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void
  className?: string
}

export function AdvancedSearch({ onSearch, className }: AdvancedSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [filters, setFilters] = useState<SearchFilters>({})
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [popularSearches, setPopularSearches] = useState<string[]>([])
  const [availableSpeakers, setAvailableSpeakers] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Load available filters
  useEffect(() => {
    loadFilterOptions()
    loadPopularSearches()
  }, [])

  const loadFilterOptions = async () => {
    try {
      const response = await fetch('/api/meetings/filters')
      if (response.ok) {
        const data = await response.json()
        setAvailableSpeakers(data.speakers || [])
        setAvailableTags(data.tags || [])
      }
    } catch (error) {
      console.error('Error loading filters:', error)
    }
  }

  const loadPopularSearches = async () => {
    try {
      const response = await fetch('/api/search/popular')
      if (response.ok) {
        const data = await response.json()
        setPopularSearches(data.searches?.map((s: any) => s.query) || [])
      }
    } catch (error) {
      console.error('Error loading popular searches:', error)
    }
  }

  const loadSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setSuggestions([])
      return
    }

    try {
      const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Error loading suggestions:', error)
    }
  }, [])

  // Debounced suggestion loading
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSuggestions(query)
    }, 300)

    return () => clearTimeout(timer)
  }, [query, loadSuggestions])

  const handleSearch = () => {
    if (!query.trim()) {
      toast.error('Kérem adjon meg keresési kifejezést')
      return
    }

    // Build URL params
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

    setShowSuggestions(false)
    onSearch(query, filters)
    router.push(`/search?${params.toString()}`)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const clearFilter = (filterType: keyof SearchFilters) => {
    setFilters({ ...filters, [filterType]: undefined })
  }

  const addSpeaker = (speaker: string) => {
    const speakers = filters.speakers || []
    if (!speakers.includes(speaker)) {
      setFilters({ ...filters, speakers: [...speakers, speaker] })
    }
  }

  const removeSpeaker = (speaker: string) => {
    setFilters({
      ...filters,
      speakers: filters.speakers?.filter(s => s !== speaker)
    })
  }

  const addTag = (tag: string) => {
    const tags = filters.tags || []
    if (!tags.includes(tag)) {
      setFilters({ ...filters, tags: [...tags, tag] })
    }
  }

  const removeTag = (tag: string) => {
    setFilters({
      ...filters,
      tags: filters.tags?.filter(t => t !== tag)
    })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search Input */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setShowSuggestions(true)
              }}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Keresés a meetingekben..."
              className="pl-10 pr-4"
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && (suggestions.length > 0 || popularSearches.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                {suggestions.length > 0 && (
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-500 px-2 py-1">Javaslatok</p>
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
                        onClick={() => {
                          setQuery(suggestion)
                          setShowSuggestions(false)
                          handleSearch()
                        }}
                      >
                        <History className="h-4 w-4 text-gray-400" />
                        <span>{suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {popularSearches.length > 0 && (
                  <div className="p-2 border-t">
                    <p className="text-xs font-medium text-gray-500 px-2 py-1">Népszerű keresések</p>
                    {popularSearches.slice(0, 5).map((search, idx) => (
                      <button
                        key={idx}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded flex items-center gap-2"
                        onClick={() => {
                          setQuery(search)
                          setShowSuggestions(false)
                          handleSearch()
                        }}
                      >
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        <span>{search}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Keresés'
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Date Range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              {filters.dateFrom || filters.dateTo ? (
                <span>
                  {filters.dateFrom && format(filters.dateFrom, 'yyyy.MM.dd', { locale: hu })}
                  {filters.dateFrom && filters.dateTo && ' - '}
                  {filters.dateTo && format(filters.dateTo, 'yyyy.MM.dd', { locale: hu })}
                </span>
              ) : (
                'Időszak'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-4 space-y-4">
              <div>
                <Label>Kezdő dátum</Label>
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={(date) => setFilters({ ...filters, dateFrom: date || undefined })}
                  locale={hu}
                />
              </div>
              <div>
                <Label>Záró dátum</Label>
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={(date) => setFilters({ ...filters, dateTo: date || undefined })}
                  locale={hu}
                />
              </div>
              {(filters.dateFrom || filters.dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ ...filters, dateFrom: undefined, dateTo: undefined })}
                  className="w-full"
                >
                  Törlés
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Speakers */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Beszélők {filters.speakers?.length ? `(${filters.speakers.length})` : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Beszélő keresése..." />
              <CommandList>
                <CommandEmpty>Nincs találat</CommandEmpty>
                <CommandGroup>
                  {availableSpeakers.map((speaker) => (
                    <CommandItem
                      key={speaker}
                      onSelect={() => addSpeaker(speaker)}
                    >
                      {speaker}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Tags */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Tags className="h-4 w-4 mr-2" />
              Címkék {filters.tags?.length ? `(${filters.tags.length})` : ''}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0" align="start">
            <Command>
              <CommandInput placeholder="Címke keresése..." />
              <CommandList>
                <CommandEmpty>Nincs találat</CommandEmpty>
                <CommandGroup>
                  {availableTags.map((tag) => (
                    <CommandItem
                      key={tag}
                      onSelect={() => addTag(tag)}
                    >
                      {tag}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters */}
      {(filters.speakers?.length || filters.tags?.length || filters.dateFrom || filters.dateTo) && (
        <div className="flex flex-wrap gap-2">
          {filters.speakers?.map((speaker) => (
            <Badge key={speaker} variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {speaker}
              <button
                onClick={() => removeSpeaker(speaker)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {filters.tags?.map((tag) => (
            <Badge key={tag} variant="secondary">
              <Tags className="h-3 w-3 mr-1" />
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          
          {(filters.dateFrom || filters.dateTo) && (
            <Badge variant="secondary">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {filters.dateFrom && format(filters.dateFrom, 'yyyy.MM.dd')}
              {filters.dateFrom && filters.dateTo && ' - '}
              {filters.dateTo && format(filters.dateTo, 'yyyy.MM.dd')}
              <button
                onClick={() => clearFilter('dateFrom')}
                className="ml-1 hover:text-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters({})}
          >
            Szűrők törlése
          </Button>
        </div>
      )}
    </div>
  )
}