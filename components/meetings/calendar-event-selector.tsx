'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, Video, Link2 } from 'lucide-react'
import { toast } from 'sonner'

interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
  }
  end: {
    dateTime?: string
    date?: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
  }>
  meetingLink?: string
  meetingId?: string
}

interface CalendarEventSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (eventId: string) => void
  selectedDate?: Date
}

export function CalendarEventSelector({ 
  open, 
  onClose, 
  onSelect,
  selectedDate 
}: CalendarEventSelectorProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      fetchEvents()
    }
  }, [open, selectedDate])

  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      // Calculate time range based on selected date or default to today
      const baseDate = selectedDate || new Date()
      const startDate = new Date(baseDate)
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = new Date(baseDate)
      endDate.setHours(23, 59, 59, 999)
      endDate.setDate(endDate.getDate() + 1) // Include next day for better coverage

      const params = new URLSearchParams({
        timeMin: startDate.toISOString(),
        timeMax: endDate.toISOString(),
        maxResults: '20'
      })

      const response = await fetch(`/api/integrations/calendar/events?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      // Filter out events that already have meetings
      const availableEvents = (data.events || []).filter((e: CalendarEvent) => !e.meetingId)
      setEvents(availableEvents)
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Nem sikerült betölteni az eseményeket')
    } finally {
      setIsLoading(false)
    }
  }

  const formatEventTime = (event: CalendarEvent) => {
    const startDate = new Date(event.start.dateTime || event.start.date || '')
    const endDate = new Date(event.end.dateTime || event.end.date || '')
    
    if (event.start.date && !event.start.dateTime) {
      return 'Egész nap'
    }

    return `${startDate.toLocaleTimeString('hu-HU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })} - ${endDate.toLocaleTimeString('hu-HU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`
  }

  const handleSelect = () => {
    if (selectedEventId) {
      onSelect(selectedEventId)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Naptár esemény kiválasztása
          </DialogTitle>
          <DialogDescription>
            Válassza ki azt az eseményt, amelyhez ezt a felvételt szeretné kapcsolni
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Események betöltése...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-600">
                Nincs elérhető naptár esemény erre a napra
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Próbáljon másik napot választani vagy töltse fel kapcsolás nélkül
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedEventId === event.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedEventId(event.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">
                        {event.summary}
                      </h4>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatEventTime(event)}
                        </span>
                        {event.attendees && event.attendees.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {event.attendees.length} résztvevő
                          </span>
                        )}
                      </div>
                      {event.meetingLink && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          <Video className="mr-1 h-3 w-3" />
                          Online meeting
                        </Badge>
                      )}
                    </div>
                    {selectedEventId === event.id && (
                      <div className="flex-shrink-0">
                        <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t">
          <Button
            variant="ghost"
            onClick={() => {
              onSelect('')
              onClose()
            }}
          >
            Feltöltés kapcsolás nélkül
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Mégse
            </Button>
            <Button 
              onClick={handleSelect} 
              disabled={!selectedEventId}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Kiválasztás és kapcsolás
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}