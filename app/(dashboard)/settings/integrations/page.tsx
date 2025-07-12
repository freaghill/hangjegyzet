'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { GoogleDriveIntegration } from '@/components/settings/google-drive-integration'
import { CalendarIntegration } from '@/components/settings/calendar-integration'
import { ZoomIntegration } from '@/components/settings/zoom-integration'
import { MiniCRMIntegration } from '@/components/settings/minicrm-integration'
import { NotificationSettings } from '@/components/settings/notification-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function IntegrationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Handle OAuth redirect messages
    const error = searchParams.get('error')
    const success = searchParams.get('success')

    if (error) {
      if (error === 'database_error') {
        toast.error('Failed to save integration settings')
      } else if (error === 'oauth_failed') {
        toast.error('Failed to connect to service')
      } else if (error === 'no_organization') {
        toast.error('Please join an organization first')
      } else {
        toast.error(`Connection error: ${error}`)
      }
    }

    if (success === 'google_drive_connected') {
      toast.success('Successfully connected to Google Drive!')
    } else if (success === 'google_calendar_connected') {
      toast.success('Successfully connected to Google Calendar!')
    } else if (success === 'zoom_connected') {
      toast.success('Successfully connected to Zoom!')
    } else if (success === 'minicrm_connected') {
      toast.success('Successfully connected to MiniCRM!')
    }
  }, [searchParams])

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Integrations</h3>
        <p className="text-sm text-muted-foreground">
          Connect external services to enhance your meeting workflow
        </p>
      </div>

      <GoogleDriveIntegration />
      
      <CalendarIntegration />
      
      <ZoomIntegration />
      
      <MiniCRMIntegration />
      
      <NotificationSettings />

      {/* Future integrations can be added here */}
      <Card>
        <CardHeader>
          <CardTitle>More Integrations Coming Soon</CardTitle>
          <CardDescription>
            We're working on adding more integrations to help you work more efficiently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• Microsoft Teams - Import Teams meeting recordings and calendar</p>
            <p>• Dropbox - Sync recordings from Dropbox folders</p>
            <p>• Microsoft OneDrive - Import from OneDrive folders</p>
            <p>• Slack - Share transcripts directly to Slack channels</p>
            <p>• Notion - Export summaries and notes to Notion</p>
            <p>• Salesforce - Sync meetings to Salesforce CRM</p>
            <p>• HubSpot - Create activities in HubSpot CRM</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}