'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Search, 
  Download, 
  Copy, 
  Check,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Highlighter,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TranscriptSegment {
  id: string
  speaker?: string
  start_time: number
  end_time: number
  text: string
  confidence?: number
}

interface TranscriptViewerProps {
  segments: TranscriptSegment[]
  currentTime?: number
  onSegmentClick?: (segment: TranscriptSegment) => void
  className?: string
  title?: string
  language?: string
}

export function TranscriptViewer({ 
  segments, 
  currentTime = 0,
  onSegmentClick,
  className,
  title,
  language
}: TranscriptViewerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedSegments, setHighlightedSegments] = useState<Set<string>>(new Set())
  const [copiedSegmentId, setCopiedSegmentId] = useState<string | null>(null)
  const [showSpeakerFilter, setShowSpeakerFilter] = useState(false)
  const [selectedSpeakers, setSelectedSpeakers] = useState<Set<string>>(new Set())
  const activeSegmentRef = useRef<HTMLDivElement>(null)

  // Get unique speakers
  const speakers = Array.from(new Set(segments.map(s => s.speaker).filter(Boolean)))

  // Filter segments
  const filteredSegments = segments.filter(segment => {
    const matchesSearch = !searchQuery || 
      segment.text.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSpeaker = selectedSpeakers.size === 0 || 
      (segment.speaker && selectedSpeakers.has(segment.speaker))
    return matchesSearch && matchesSpeaker
  })

  // Find active segment based on current time
  const activeSegmentId = segments.find(
    s => currentTime >= s.start_time && currentTime <= s.end_time
  )?.id

  // Auto-scroll to active segment
  useEffect(() => {
    if (activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [activeSegmentId])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const copySegment = async (segment: TranscriptSegment) => {
    try {
      const text = segment.speaker 
        ? `[${segment.speaker}] ${segment.text}`
        : segment.text
      await navigator.clipboard.writeText(text)
      setCopiedSegmentId(segment.id)
      setTimeout(() => setCopiedSegmentId(null), 2000)
      toast.success('Szöveg másolva')
    } catch (error) {
      toast.error('Másolás sikertelen')
    }
  }

  const downloadTranscript = () => {
    const content = segments
      .map(s => {
        const time = formatTime(s.start_time)
        const speaker = s.speaker ? `[${s.speaker}]` : ''
        return `${time} ${speaker} ${s.text}`
      })
      .join('\n\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${title || 'transcript'}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const toggleHighlight = (segmentId: string) => {
    const newHighlighted = new Set(highlightedSegments)
    if (newHighlighted.has(segmentId)) {
      newHighlighted.delete(segmentId)
    } else {
      newHighlighted.add(segmentId)
    }
    setHighlightedSegments(newHighlighted)
  }

  const toggleSpeaker = (speaker: string) => {
    const newSelected = new Set(selectedSpeakers)
    if (newSelected.has(speaker)) {
      newSelected.delete(speaker)
    } else {
      newSelected.add(speaker)
    }
    setSelectedSpeakers(newSelected)
  }

  // Calculate word count and reading time
  const wordCount = segments.reduce((count, s) => count + s.text.split(' ').length, 0)
  const readingTime = Math.ceil(wordCount / 200) // Average reading speed

  return (
    <Card className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="font-semibold text-lg">{title}</h3>}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {wordCount} szó
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                ~{readingTime} perc olvasási idő
              </span>
              {language && (
                <Badge variant="secondary" className="text-xs">
                  {language === 'hu' ? 'Magyar' : language.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={downloadTranscript}
          >
            <Download className="h-4 w-4 mr-1" />
            Letöltés
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Keresés az átírásban..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Speaker Filter */}
        {speakers.length > 1 && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSpeakerFilter(!showSpeakerFilter)}
              className="w-full justify-between"
            >
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Beszélők szűrése
                {selectedSpeakers.size > 0 && (
                  <Badge variant="secondary">{selectedSpeakers.size}</Badge>
                )}
              </span>
              {showSpeakerFilter ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            
            {showSpeakerFilter && (
              <div className="flex flex-wrap gap-2 mt-2">
                {speakers.map((speaker) => (
                  <Badge
                    key={speaker}
                    variant={selectedSpeakers.has(speaker!) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSpeaker(speaker!)}
                  >
                    {speaker}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transcript Content */}
      <ScrollArea className="flex-1">
        <CardContent className="p-4 space-y-2">
          {filteredSegments.map((segment) => {
            const isActive = segment.id === activeSegmentId
            const isHighlighted = highlightedSegments.has(segment.id)
            const isCopied = copiedSegmentId === segment.id

            return (
              <div
                key={segment.id}
                ref={isActive ? activeSegmentRef : null}
                className={cn(
                  "group relative p-3 rounded-lg transition-all cursor-pointer",
                  isActive && "bg-primary/10 ring-2 ring-primary/20",
                  isHighlighted && "bg-yellow-50",
                  !isActive && !isHighlighted && "hover:bg-muted/50"
                )}
                onClick={() => onSegmentClick?.(segment)}
              >
                {/* Timestamp and Speaker */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground font-mono">
                      {formatTime(segment.start_time)}
                    </span>
                    {segment.speaker && (
                      <Badge variant="outline" className="text-xs">
                        {segment.speaker}
                      </Badge>
                    )}
                    {segment.confidence && segment.confidence < 0.8 && (
                      <Badge variant="secondary" className="text-xs">
                        Bizonytalan
                      </Badge>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleHighlight(segment.id)
                      }}
                    >
                      <Highlighter className={cn(
                        "h-3.5 w-3.5",
                        isHighlighted && "text-yellow-600"
                      )} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation()
                        copySegment(segment)
                      }}
                    >
                      {isCopied ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Text */}
                <p className="text-sm leading-relaxed">
                  {searchQuery ? (
                    <HighlightedText text={segment.text} query={searchQuery} />
                  ) : (
                    segment.text
                  )}
                </p>
              </div>
            )
          })}
          
          {filteredSegments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nincs találat</p>
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  )
}

// Helper component for search highlighting
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'))
  
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-200">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}