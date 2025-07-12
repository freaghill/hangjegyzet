'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Search,
  Filter,
  X,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react'

interface SearchBarProps {
  onSearch?: (query: string, filters: any) => void
  className?: string
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [isSearching, setIsSearching] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [speakers, setSpeakers] = useState<string[]>([])
  
  // Filter states
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('')
  const [minDuration, setMinDuration] = useState<string>('')
  const [maxDuration, setMaxDuration] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  
  // Synonym suggestions
  const [suggestions, setSuggestions] = useState<string[]>([])
  
  // Load speakers on mount
  useEffect(() => {
    loadSpeakers()
  }, [])
  
  const loadSpeakers = async () => {
    try {
      const response = await fetch('/api/meetings/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getSpeakers' })
      })
      
      if (response.ok) {
        const data = await response.json()
        setSpeakers(data.speakers)
      }
    } catch (error) {
      console.error('Failed to load speakers:', error)
    }
  }
  
  // Show synonym suggestions based on input
  useEffect(() => {
    const synonymMap: Record<string, string[]> = {
      'budget': ['költségvetés', 'büdzsé'],
      'meeting': ['megbeszélés', 'értekezlet'],
      'task': ['feladat', 'teendő'],
      'deadline': ['határidő', 'lejárat'],
      'projekt': ['project', 'program'],
      'ügyfél': ['kliens', 'vevő', 'partner'],
      'bevétel': ['árbevétel', 'forgalom'],
      'költség': ['kiadás', 'ráfordítás'],
    }
    
    const words = query.toLowerCase().split(/\s+/)
    const lastWord = words[words.length - 1]
    
    if (!lastWord || lastWord.length < 2) {
      setSuggestions([])
      return
    }
    
    const foundSuggestions: string[] = []
    for (const [key, values] of Object.entries(synonymMap)) {
      if (key.startsWith(lastWord) || values.some(v => v.startsWith(lastWord))) {
        foundSuggestions.push(...values.filter(v => v !== lastWord))
      }
    }
    
    setSuggestions(foundSuggestions.slice(0, 3))
  }, [query])
  
  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string, filters: any) => {
    if (!searchQuery.trim() && !Object.keys(filters).length) {
      return
    }
    
    setIsSearching(true)
    
    try {
      // Build query string
      const params = new URLSearchParams()
      if (searchQuery) params.set('q', searchQuery)
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      if (filters.speaker) params.set('speaker', filters.speaker)
      if (filters.minDuration) params.set('minDuration', filters.minDuration)
      if (filters.maxDuration) params.set('maxDuration', filters.maxDuration)
      if (filters.status) params.set('status', filters.status)
      
      // Update URL
      router.push(`/meetings?${params.toString()}`)
      
      // Call onSearch callback if provided
      if (onSearch) {
        onSearch(searchQuery, filters)
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Hiba történt a keresés során')
    } finally {
      setIsSearching(false)
    }
  }, [router, onSearch])
  
  const handleSearch = useCallback(() => {
    const filters: any = {}
    
    if (dateFrom) filters.dateFrom = dateFrom
    if (dateTo) filters.dateTo = dateTo
    if (selectedSpeaker) filters.speaker = selectedSpeaker
    if (minDuration) filters.minDuration = parseInt(minDuration) * 60
    if (maxDuration) filters.maxDuration = parseInt(maxDuration) * 60
    if (status) filters.status = status
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query, filters)
    }, 500)
  }, [query, dateFrom, dateTo, selectedSpeaker, minDuration, maxDuration, status, performSearch])
  
  // Trigger search on query change
  useEffect(() => {
    handleSearch()
  }, [query])
  
  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    setSelectedSpeaker('')
    setMinDuration('')
    setMaxDuration('')
    setStatus('')
    setQuery('')
    router.push('/meetings')
  }
  
  const activeFilterCount = [
    dateFrom,
    dateTo,
    selectedSpeaker,
    minDuration,
    maxDuration,
    status
  ].filter(Boolean).length
  
  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Keresés a meetingekben... (pl. költségvetés, deadline)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch()
              }
            }}
            className="pl-10 pr-4"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
        
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="relative"
        >
          <Filter className="h-4 w-4 mr-2" />
          Szűrők
          {activeFilterCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>
      
      {/* Synonym suggestions */}
      {suggestions.length > 0 && (
        <div className="flex gap-2 items-center">
          <span className="text-sm text-gray-600">Kapcsolódó kifejezések:</span>
          {suggestions.map((suggestion) => (
            <Badge
              key={suggestion}
              variant="secondary"
              className="cursor-pointer hover:bg-secondary/80"
              onClick={() => {
                const words = query.split(/\s+/)
                words[words.length - 1] = suggestion
                setQuery(words.join(' '))
              }}
            >
              {suggestion}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Filters panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date range */}
              <div className="space-y-2">
                <Label className="text-sm">Kezdő dátum</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    handleSearch()
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Záró dátum</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    handleSearch()
                  }}
                />
              </div>
              
              {/* Speaker filter */}
              <div className="space-y-2">
                <Label className="text-sm">Résztvevő</Label>
                <select
                  value={selectedSpeaker}
                  onChange={(e) => {
                    setSelectedSpeaker(e.target.value)
                    handleSearch()
                  }}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Mind</option>
                  {speakers.map((speaker) => (
                    <option key={speaker} value={speaker}>
                      {speaker}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Duration range */}
              <div className="space-y-2">
                <Label className="text-sm">Min. időtartam (perc)</Label>
                <Input
                  type="number"
                  value={minDuration}
                  onChange={(e) => {
                    setMinDuration(e.target.value)
                    handleSearch()
                  }}
                  placeholder="0"
                  min="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">Max. időtartam (perc)</Label>
                <Input
                  type="number"
                  value={maxDuration}
                  onChange={(e) => {
                    setMaxDuration(e.target.value)
                    handleSearch()
                  }}
                  placeholder="180"
                  min="0"
                />
              </div>
              
              {/* Status filter */}
              <div className="space-y-2">
                <Label className="text-sm">Állapot</Label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value)
                    handleSearch()
                  }}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Mind</option>
                  <option value="completed">Kész</option>
                  <option value="processing">Feldolgozás alatt</option>
                  <option value="failed">Sikertelen</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
              >
                <X className="h-4 w-4 mr-1" />
                Szűrők törlése
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}