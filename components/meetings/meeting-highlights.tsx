'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Clock, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Download,
  Copy,
  CheckCheck
} from 'lucide-react'
import { toast } from 'sonner'

interface MeetingHighlight {
  type: 'key_decision' | 'action_item' | 'important_discussion' | 'question' | 'summary'
  content: string
  timestamp?: number
  speaker?: string
  priority?: 'high' | 'medium' | 'low'
}

interface HighlightsData {
  summary: string
  keyMoments: MeetingHighlight[]
  actionItems: string[]
  decisions: string[]
  duration: number
  originalDuration: number
}

interface MeetingHighlightsProps {
  meetingId: string
  onTimestampClick?: (timestamp: number) => void
}

export function MeetingHighlights({ meetingId, onTimestampClick }: MeetingHighlightsProps) {
  const [highlights, setHighlights] = useState<HighlightsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchHighlights()
  }, [meetingId])

  const fetchHighlights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/meetings/${meetingId}/highlights`)
      if (response.ok) {
        const data = await response.json()
        setHighlights(data)
      } else if (response.status === 404) {
        // Highlights not generated yet
        setHighlights(null)
      }
    } catch (error) {
      console.error('Failed to fetch highlights:', error)
      toast.error('Nem sikerült betölteni az összefoglalót')
    } finally {
      setIsLoading(false)
    }
  }

  const generateHighlights = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch(`/api/meetings/${meetingId}/highlights`, {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        setHighlights(data)
        toast.success('Összefoglaló elkészült!')
      } else {
        throw new Error('Failed to generate highlights')
      }
    } catch (error) {
      console.error('Failed to generate highlights:', error)
      toast.error('Nem sikerült elkészíteni az összefoglalót')
    } finally {
      setIsGenerating(false)
    }
  }

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const copyToClipboard = async () => {
    if (!highlights) return
    
    let text = `# Meeting összefoglaló\n\n`
    text += `## Összefoglaló\n${highlights.summary}\n\n`
    
    if (highlights.decisions.length > 0) {
      text += `## Döntések\n`
      highlights.decisions.forEach((decision, i) => {
        text += `${i + 1}. ${decision}\n`
      })
      text += '\n'
    }
    
    if (highlights.actionItems.length > 0) {
      text += `## Teendők\n`
      highlights.actionItems.forEach(item => {
        text += `- [ ] ${item}\n`
      })
    }
    
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Összefoglaló vágólapra másolva')
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error('Nem sikerült másolni')
    }
  }

  const downloadMarkdown = () => {
    if (!highlights) return
    
    let text = `# Meeting összefoglaló\n\n`
    text += `Eredeti hossz: ${Math.floor(highlights.originalDuration / 60)} perc\n`
    text += `Összefoglaló hossza: ${Math.floor(highlights.duration / 60)} perc\n\n`
    
    text += `## Összefoglaló\n${highlights.summary}\n\n`
    
    if (highlights.decisions.length > 0) {
      text += `## Döntések\n`
      highlights.decisions.forEach((decision, i) => {
        text += `${i + 1}. ${decision}\n`
      })
      text += '\n'
    }
    
    if (highlights.actionItems.length > 0) {
      text += `## Teendők\n`
      highlights.actionItems.forEach(item => {
        text += `- [ ] ${item}\n`
      })
      text += '\n'
    }
    
    if (highlights.keyMoments.length > 0) {
      text += `## Kulcs pillanatok\n`
      highlights.keyMoments
        .filter(m => m.type !== 'summary')
        .forEach(moment => {
          const time = moment.timestamp ? `[${formatTimestamp(moment.timestamp)}] ` : ''
          const speaker = moment.speaker ? `**${moment.speaker}**: ` : ''
          text += `- ${time}${speaker}${moment.content}\n`
        })
    }
    
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `meeting-highlights-${meetingId}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </Card>
    )
  }

  if (!highlights) {
    return (
      <Card className="p-6">
        <div className="text-center space-y-4">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground" />
          <h3 className="text-lg font-semibold">Még nincs összefoglaló</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Készíts egy 2-3 perces összefoglalót a meeting lényegéről, 
            kulcs pillanatokkal és teendőkkel.
          </p>
          <Button 
            onClick={generateHighlights} 
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>Készítés folyamatban...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Összefoglaló készítése
              </>
            )}
          </Button>
        </div>
      </Card>
    )
  }

  const timeSaved = Math.floor((highlights.originalDuration - highlights.duration) / 60)
  const timeReduction = Math.round((1 - highlights.duration / highlights.originalDuration) * 100)

  return (
    <div className="space-y-4">
      {/* Time savings banner */}
      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium">
                {Math.floor(highlights.duration / 60)} perces összefoglaló
              </p>
              <p className="text-sm text-muted-foreground">
                {timeSaved} percet spórolsz ({timeReduction}% időmegtakarítás)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="gap-2"
            >
              {copied ? (
                <CheckCheck className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? 'Másolva' : 'Másolás'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadMarkdown}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Letöltés
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Összefoglaló
        </h3>
        <p className="text-muted-foreground leading-relaxed">
          {highlights.summary}
        </p>
      </Card>

      {/* Decisions and Action Items */}
      <div className="grid gap-4 md:grid-cols-2">
        {highlights.decisions.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Döntések
            </h3>
            <ul className="space-y-2">
              {highlights.decisions.map((decision, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">•</span>
                  <span className="text-sm">{decision}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {highlights.actionItems.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Teendők
            </h3>
            <ul className="space-y-2">
              {highlights.actionItems.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <input 
                    type="checkbox" 
                    className="mt-1 rounded border-gray-300"
                  />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {/* Key Moments */}
      {highlights.keyMoments.filter(m => m.type !== 'summary').length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-3">Kulcs pillanatok</h3>
          <div className="space-y-3">
            {highlights.keyMoments
              .filter(m => m.type !== 'summary')
              .map((moment, i) => (
                <div 
                  key={i} 
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {moment.timestamp && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTimestampClick?.(moment.timestamp!)}
                      className="text-xs font-mono"
                    >
                      {formatTimestamp(moment.timestamp)}
                    </Button>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {moment.speaker && (
                        <span className="font-medium text-sm">{moment.speaker}</span>
                      )}
                      {moment.priority && (
                        <Badge 
                          variant={
                            moment.priority === 'high' ? 'destructive' :
                            moment.priority === 'medium' ? 'default' : 'secondary'
                          }
                          className="text-xs"
                        >
                          {moment.priority === 'high' ? 'Magas' :
                           moment.priority === 'medium' ? 'Közepes' : 'Alacsony'}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {moment.type === 'action_item' ? 'Teendő' :
                         moment.type === 'key_decision' ? 'Döntés' :
                         moment.type === 'important_discussion' ? 'Fontos' :
                         moment.type === 'question' ? 'Kérdés' : 'Egyéb'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{moment.content}</p>
                  </div>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  )
}