import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2 } from 'lucide-react'

// Loading components
const ChartLoader = () => (
  <div className="w-full h-[300px] flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
  </div>
)

const TableLoader = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-12 w-full" />
    ))}
  </div>
)

const FormLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-32" />
  </div>
)

// Dynamic imports with loading states
export const DynamicAudioWaveform = dynamic(
  () => import('@/components/audio/audio-waveform').then(mod => mod.AudioWaveform),
  {
    loading: () => <Skeleton className="h-32 w-full" />,
    ssr: false,
  }
)

export const DynamicTranscriptionEditor = dynamic(
  () => import('@/components/transcription/transcription-editor').then(mod => mod.TranscriptionEditor),
  {
    loading: () => <TableLoader />,
    ssr: false,
  }
)

export const DynamicUploadModal = dynamic(
  () => import('@/components/upload/upload-modal').then(mod => mod.UploadModal),
  {
    loading: () => <FormLoader />,
  }
)

export const DynamicAdvancedSearch = dynamic(
  () => import('@/components/search/advanced-search').then(mod => mod.AdvancedSearch),
  {
    loading: () => <FormLoader />,
  }
)

// Analytics components (heavy charts)
export const DynamicUsageAnalytics = dynamic(
  () => import('@/components/analytics/usage-analytics').then(mod => mod.UsageAnalytics),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
)

export const DynamicPerformanceAnalytics = dynamic(
  () => import('@/components/analytics/performance-analytics').then(mod => mod.PerformanceAnalytics),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
)

export const DynamicBusinessAnalytics = dynamic(
  () => import('@/components/analytics/business-analytics').then(mod => mod.BusinessAnalytics),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
)

// Admin components
export const DynamicEmailPreview = dynamic(
  () => import('@/components/admin/email-preview').then(mod => mod.EmailPreview),
  {
    loading: () => <FormLoader />,
  }
)

export const DynamicEmailLogs = dynamic(
  () => import('@/components/admin/email-logs').then(mod => mod.EmailLogs),
  {
    loading: () => <TableLoader />,
  }
)

// Team components
export const DynamicTeamMembers = dynamic(
  () => import('@/components/teams/team-members').then(mod => mod.TeamMembers),
  {
    loading: () => <TableLoader />,
  }
)

export const DynamicTeamSettings = dynamic(
  () => import('@/components/teams/team-settings').then(mod => mod.TeamSettings),
  {
    loading: () => <FormLoader />,
  }
)

// Meeting components
export const DynamicMeetingPlayer = dynamic(
  () => import('@/components/meetings/meeting-player').then(mod => mod.MeetingPlayer),
  {
    loading: () => <Skeleton className="aspect-video w-full" />,
    ssr: false,
  }
)

export const DynamicMeetingExport = dynamic(
  () => import('@/components/meetings/meeting-export').then(mod => mod.MeetingExport),
  {
    loading: () => <FormLoader />,
  }
)

// Rich text editor (heavy)
export const DynamicRichTextEditor = dynamic(
  () => import('@/components/editor/rich-text-editor').then(mod => mod.RichTextEditor),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
    ssr: false,
  }
)