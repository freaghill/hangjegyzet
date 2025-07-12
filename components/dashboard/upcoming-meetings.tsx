'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Clock, Users, Video, ExternalLink, RefreshCw } from 'lucide-react'
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
    responseStatus?: string
  }>
  location?: string
  meetingLink?: string
  meetingId?: string
}

export function UpcomingMeetings() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasCalendar, setHasCalendar] = useState(true)

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/calendar/events?maxResults=5')
      
      if (response.status === 404) {
        setHasCalendar(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Error fetching events:', error)
      toast.error('Nem sikerült betölteni az eseményeket')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchEvents()
  }

  const formatEventTime = (event: CalendarEvent) => {
    const startDate = new Date(event.start.dateTime || event.start.date || '')
    const endDate = new Date(event.end.dateTime || event.end.date || '')
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const eventDay = new Date(startDate)
    eventDay.setHours(0, 0, 0, 0)
    
    let dayString = ''
    if (eventDay.getTime() === today.getTime()) {
      dayString = 'Ma'
    } else if (eventDay.getTime() === tomorrow.getTime()) {
      dayString = 'Holnap'
    } else {
      dayString = startDate.toLocaleDateString('hu-HU', { 
        month: 'short', 
        day: 'numeric' 
      })
    }

    if (event.start.date && !event.start.dateTime) {
      // All-day event
      return `${dayString} - Egész nap`
    }

    const timeString = `${startDate.toLocaleTimeString('hu-HU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })} - ${endDate.toLocaleTimeString('hu-HU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`

    return `${dayString}, ${timeString}`
  }

  const getAttendeeCount = (event: CalendarEvent) => {
    if (!event.attendees || event.attendees.length === 0) return 0
    return event.attendees.filter(a => a.responseStatus !== 'declined').length
  }

  if (isLoading) {
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Közelgő meetingek
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!hasCalendar) {
    return (
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Közelgő meetingek
          </CardTitle>
          <CardDescription>
            Kapcsolja össze Google Naptárját a meetingek követéséhez
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/integrations">
            <Button variant="outline" className="w-full">
              <Calendar className="mr-2 h-4 w-4" />
              Google Naptár kapcsolása
            </Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-effect">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Közelgő meetingek
            </CardTitle>
            <CardDescription>
              A következő 7 nap eseményei
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <p className="text-sm text-gray-600">
              Nincs közelgő meeting a következő 7 napban
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {event.summary}
                    </h4>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatEventTime(event)}
                      </span>
                      {getAttendeeCount(event) > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {getAttendeeCount(event)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {event.meetingLink && (
                        <Badge variant="secondary" className="text-xs">
                          <Video className="mr-1 h-3 w-3" />
                          Online
                        </Badge>
                      )}
                      {event.meetingId && (
                        <Link href={`/meetings/${event.meetingId}`}>
                          <Badge variant="default" className="text-xs cursor-pointer">
                            Átírat kész
                          </Badge>
                        </Link>
                      )}
                    </div>
                  </div>
                  {event.meetingLink && (
                    <a
                      href={event.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}