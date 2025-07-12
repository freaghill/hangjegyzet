'use client'

import { useState } from 'react'
import RealtimeTranscription from '@/components/realtime/realtime-transcription'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'

export default function TestRealtimePage() {
  const [transcript, setTranscript] = useState('')
  const testMeetingId = `test-meeting-${Date.now()}`

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Valós idejű átírás teszt</h1>
        <p className="text-muted-foreground">
          Teszteld a valós idejű hangátírás funkcióját
        </p>
      </div>

      <Alert className="mb-6">
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          <strong>Teszt mód:</strong> Ez egy fejlesztői tesztoldal a valós idejű átírás teszteléséhez.
          A WebSocket szervernek futnia kell a 3001-es porton.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-[600px]">
          <RealtimeTranscription 
            meetingId={testMeetingId}
            onTranscriptionUpdate={setTranscript}
          />
        </div>

        <Card className="h-[600px] overflow-hidden">
          <CardHeader>
            <CardTitle>Teljes átírat</CardTitle>
            <CardDescription>
              Az eddig rögzített teljes szöveg
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[480px] overflow-y-auto p-4 bg-muted/10 rounded-md">
              {transcript || (
                <p className="text-muted-foreground text-center">
                  Az átírt szöveg itt fog megjelenni...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-4 bg-muted/20 rounded-md">
        <h3 className="font-semibold mb-2">Fejlesztői információk:</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>• Meeting ID: {testMeetingId}</li>
          <li>• WebSocket URL: {process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002'}</li>
          <li>• Audio endpoint: /api/realtime/audio</li>
        </ul>
      </div>
    </div>
  )
}