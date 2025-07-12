'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GoogleDriveIntegration from './google-drive-integration'
import CalendarIntegration from './calendar-integration'
import ZoomIntegration from './zoom-integration'
import MiniCRMIntegration from './minicrm-integration'

export default function IntegrationSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Integrációk</CardTitle>
          <CardDescription>
            Külső szolgáltatások összekapcsolása a HangJegyzet rendszerrel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="google-drive" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="google-drive">Google Drive</TabsTrigger>
              <TabsTrigger value="calendar">Google Calendar</TabsTrigger>
              <TabsTrigger value="zoom">Zoom</TabsTrigger>
              <TabsTrigger value="minicrm">MiniCRM</TabsTrigger>
            </TabsList>
            
            <TabsContent value="google-drive">
              <GoogleDriveIntegration />
            </TabsContent>
            
            <TabsContent value="calendar">
              <CalendarIntegration />
            </TabsContent>
            
            <TabsContent value="zoom">
              <ZoomIntegration />
            </TabsContent>
            
            <TabsContent value="minicrm">
              <MiniCRMIntegration />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}