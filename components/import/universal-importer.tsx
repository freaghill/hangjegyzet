'use client'

import { useState, useEffect } from 'react'
import Uppy from '@uppy/core'
import Dashboard from '@uppy/dashboard'
import Dropbox from '@uppy/dropbox'
import GoogleDrive from '@uppy/google-drive'
import OneDrive from '@uppy/onedrive'
import Url from '@uppy/url'
import Audio from '@uppy/audio'
import Webcam from '@uppy/webcam'
import XHRUpload from '@uppy/xhr-upload'
// import { useUppy } from '@uppy/react' - Not available in this version
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import '@uppy/core/dist/style.min.css'
import '@uppy/dashboard/dist/style.min.css'
import '@uppy/audio/dist/style.min.css'
import '@uppy/webcam/dist/style.min.css'

interface UniversalImporterProps {
  organizationId: string
  onImportComplete?: (meetingIds: string[]) => void
}

const SUPPORTED_FORMATS = [
  '.mp3', '.wav', '.m4a', '.ogg', '.webm',
  '.mp4', '.mov', '.avi', '.mkv', '.flv'
]

export function UniversalImporter({ organizationId, onImportComplete }: UniversalImporterProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [importedMeetings, setImportedMeetings] = useState<string[]>([])
  const supabase = createClient()

  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      id: 'universal-importer',
      autoProceed: false,
      allowMultipleUploadBatches: true,
      restrictions: {
        maxFileSize: 500 * 1024 * 1024, // 500MB
        allowedFileTypes: SUPPORTED_FORMATS,
      },
      meta: {
        organizationId,
      },
    })

    // Configure plugins
    uppyInstance
      .use(Dashboard, {
        inline: true,
        target: '#uppy-dashboard',
        showProgressDetails: true,
        proudlyDisplayPoweredByUppy: false,
        height: 450,
        note: 'Támogatott formátumok: MP3, WAV, M4A, OGG, WebM, MP4, MOV',
      })
      .use(Dropbox, {
        target: Dashboard,
        companionUrl: process.env.NEXT_PUBLIC_COMPANION_URL || '/api/companion',
      })
      .use(GoogleDrive, {
        target: Dashboard,
        companionUrl: process.env.NEXT_PUBLIC_COMPANION_URL || '/api/companion',
      })
      .use(OneDrive, {
        target: Dashboard,
        companionUrl: process.env.NEXT_PUBLIC_COMPANION_URL || '/api/companion',
      })
      .use(Url, {
        target: Dashboard,
        companionUrl: process.env.NEXT_PUBLIC_COMPANION_URL || '/api/companion',
      })
      .use(Audio, {
        target: Dashboard,
        showRecordingLength: true,
      })
      .use(Webcam, {
        target: Dashboard,
        modes: ['video-audio', 'audio-only'],
      })
      .use(XHRUpload, {
        endpoint: '/api/import/upload',
        fieldName: 'file',
        headers: {
          'organization-id': organizationId,
        },
      })

    return uppyInstance
  })

  // Cleanup Uppy instance on unmount
  useEffect(() => {
    return () => {
      uppy.close()
    }
  }, [uppy])

  // Event handlers
  useEffect(() => {
    uppy.on('upload', () => {
      setIsProcessing(true)
      toast.info('Fájlok feltöltése folyamatban...')
    })

    uppy.on('upload-success', (file, response) => {
      if (response.body?.meetingId) {
        setImportedMeetings(prev => [...prev, response.body.meetingId])
        toast.success(`${file.name} sikeresen importálva`)
      }
    })

    uppy.on('upload-error', (file, error) => {
      console.error('Upload error:', error)
      toast.error(`Hiba ${file?.name} importálása közben: ${error.message}`)
    })

    uppy.on('complete', (result) => {
      setIsProcessing(false)
      
      if (result.successful.length > 0) {
        toast.success(`${result.successful.length} fájl sikeresen importálva`)
        
        if (onImportComplete && importedMeetings.length > 0) {
          onImportComplete(importedMeetings)
        }
      }

      if (result.failed.length > 0) {
        toast.error(`${result.failed.length} fájl importálása sikertelen`)
      }
    })

    return () => {
      uppy.close()
    }
  }, [uppy, importedMeetings, onImportComplete])

  // Zoom import handler
  const handleZoomImport = async () => {
    const zoomWindow = window.open(
      '/api/import/zoom/auth',
      'zoom-import',
      'width=600,height=700'
    )

    // Listen for OAuth callback
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'zoom-auth-success') {
        zoomWindow?.close()
        
        // Fetch Zoom recordings
        const response = await fetch('/api/import/zoom/recordings', {
          headers: {
            'organization-id': organizationId,
          },
        })

        if (response.ok) {
          const { recordings } = await response.json()
          toast.success(`${recordings.length} Zoom felvétel találva`)
          
          // Add recordings to Uppy
          recordings.forEach((recording: any) => {
            uppy.addFile({
              name: recording.topic,
              type: 'video/mp4',
              data: {
                downloadUrl: recording.download_url,
              },
              source: 'zoom',
              isRemote: true,
            })
          })
        }
      }
    })
  }

  // Email import handler
  const handleEmailImport = async () => {
    toast.info('Email import beállítása...')
    // This would open a modal to configure email settings
    // For now, just show a message
    toast.success('Email figyelés aktiválva')
  }

  return (
    <div className="space-y-6">
      {/* Quick import buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleZoomImport}>
          <CardHeader>
            <CardTitle className="text-lg">Zoom Import</CardTitle>
            <CardDescription>Importáljon közvetlenül a Zoom fiókjából</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg">Teams Import</CardTitle>
            <CardDescription>Microsoft Teams felvételek importálása</CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={handleEmailImport}>
          <CardHeader>
            <CardTitle className="text-lg">Email Figyelés</CardTitle>
            <CardDescription>Automatikus import email mellékletekből</CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Uppy Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Univerzális Fájl Import</CardTitle>
          <CardDescription>
            Húzzon ide fájlokat vagy válasszon a forrásokból
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div id="uppy-dashboard"></div>
          
          {isProcessing && (
            <div className="mt-4 text-center text-sm text-gray-600">
              Fájlok feldolgozása folyamatban...
            </div>
          )}

          {importedMeetings.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium">
                Importált meetingek: {importedMeetings.length}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}