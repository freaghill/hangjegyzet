'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SearchBar } from '@/components/meetings/search-bar'
import { MeetingList } from '@/components/meetings/meeting-list'
import { ShareMeetingDialog } from '@/components/meetings/share-meeting-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Search } from 'lucide-react'

interface Meeting {
  id: string
  title: string
  created_at: string
  duration_seconds: number
  file_size: number
  transcription_status: 'pending' | 'processing' | 'completed' | 'failed'
  transcription_progress?: number
  speakers_count?: number
  language?: string
  meeting_date?: string
  tags?: string[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function MeetingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
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

      // Transform to Meeting format
      const results: Meeting[] = (data || []).map(meeting => ({
        id: meeting.id,
        title: meeting.title,
        created_at: meeting.created_at,
        duration_seconds: meeting.duration_seconds || 0,
        file_size: meeting.file_size || 0,
        transcription_status: meeting.transcription_status || 'pending',
        transcription_progress: meeting.metadata?.progress,
        speakers_count: meeting.metadata?.speakers_count,
        language: meeting.language,
        meeting_date: meeting.meeting_date,
        tags: meeting.tags || []
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
      toast.error('Hiba történt a megbeszélések betöltése során')
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

  const handlePlay = (meeting: Meeting) => {
    router.push(`/meetings/${meeting.id}`)
  }

  const handleDownload = async (meeting: Meeting) => {
    // TODO: Implement download functionality
    toast.info('Letöltés funkció hamarosan...')
  }

  const handleDelete = async (meeting: Meeting) => {
    if (!confirm('Biztosan törölni szeretné ezt a megbeszélést?')) return
    
    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meeting.id)
      
      if (error) throw error
      
      toast.success('Megbeszélés törölve')
      loadAllMeetings()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Hiba történt a törlés során')
    }
  }

  const handleEdit = (meeting: Meeting) => {
    router.push(`/meetings/${meeting.id}/edit`)
  }

  const handleShare = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    setShareDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Megbeszélések</h1>
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
      <MeetingList
        meetings={meetings}
        onPlay={handlePlay}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onShare={handleShare}
      />
      
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

      {/* Share Dialog */}
      {selectedMeeting && (
        <ShareMeetingDialog
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
          meetingId={selectedMeeting.id}
          meetingTitle={selectedMeeting.title}
          onSuccess={() => {
            toast.success('Meeting sikeresen megosztva')
          }}
        />
      )}
    </div>
  )
}