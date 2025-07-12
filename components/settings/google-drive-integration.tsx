'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  FolderOpen, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Check,
  AlertCircle,
  ExternalLink,
  Upload,
  FileAudio
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { hu } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'
import Uppy from '@uppy/core'
import { Dashboard } from '@uppy/react'
import GoogleDrive from '@uppy/google-drive'
import Webcam from '@uppy/webcam'
import Audio from '@uppy/audio'
import XHRUpload from '@uppy/xhr-upload'
import Hungarian from '@uppy/locales/lib/hu_HU'

// Import Uppy styles
import '@uppy/core/dist/style.min.css'
import '@uppy/dashboard/dist/style.min.css'
import '@uppy/webcam/dist/style.min.css'
import '@uppy/audio/dist/style.min.css'

interface GoogleDriveIntegration {
  id: string
  enabled: boolean
  watched_folders: Array<{
    id: string
    name: string
    lastSyncedAt?: string
  }>
  last_sync_at?: string
  auto_sync_enabled: boolean
  sync_interval: number
}

interface SyncLog {
  id: string
  folder_name: string
  files_found: number
  files_imported: number
  error?: string
  created_at: string
  completed_at?: string
}

export default function GoogleDriveIntegration() {
  const [integration, setIntegration] = useState<GoogleDriveIntegration | null>(null)
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [authenticating, setAuthenticating] = useState(false)
  const [showUploader, setShowUploader] = useState(false)
  const { toast } = useToast()

  // Initialize Uppy
  const [uppy] = useState(() =>
    new Uppy({
      id: 'google-drive-uploader',
      autoProceed: false,
      locale: Hungarian,
      restrictions: {
        allowedFileTypes: [
          '.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma',
          '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm', '.m4v'
        ],
        maxFileSize: 5 * 1024 * 1024 * 1024, // 5GB
      },
      meta: {
        source: 'google_drive'
      }
    })
    .use(GoogleDrive, {
      companionUrl: process.env.NEXT_PUBLIC_COMPANION_URL || 'https://companion.uppy.io',
      companionAllowedHosts: ['https://companion.uppy.io'],
    })
    .use(Webcam, {
      modes: ['audio-only'],
      showRecordingLength: true,
    })
    .use(Audio, {
      showRecordingLength: true,
    })
    .use(XHRUpload, {
      endpoint: '/api/meetings/upload',
      fieldName: 'file',
      headers: {
        'x-source': 'google-drive-integration'
      }
    })
  )

  useEffect(() => {
    loadIntegration()

    // Set up Uppy event handlers
    uppy.on('upload-success', (file, response) => {
      toast({
        title: 'Sikeres feltöltés',
        description: `${file.name} sikeresen feltöltve és feldolgozás alatt.`,
      })
      loadIntegration() // Refresh to show new files
    })

    uppy.on('upload-error', (file, error) => {
      toast({
        title: 'Feltöltési hiba',
        description: `${file?.name}: ${error.message}`,
        variant: 'destructive',
      })
    })

    return () => {
      uppy.close()
    }
  }, [])

  const loadIntegration = async () => {
    try {
      const response = await fetch('/api/integrations/google-drive')
      if (response.ok) {
        const data = await response.json()
        setIntegration(data.integration)
      }

      // Load sync logs
      const logsResponse = await fetch('/api/integrations/google-drive/sync')
      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setSyncLogs(logsData.logs || [])
      }
    } catch (error) {
      console.error('Failed to load integration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async () => {
    setAuthenticating(true)
    try {
      const response = await fetch('/api/integrations/google-drive/auth')
      const data = await response.json()
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült elindítani a hitelesítést',
        variant: 'destructive',
      })
    } finally {
      setAuthenticating(false)
    }
  }

  const handleSync = async (folderId?: string) => {
    setSyncing(true)
    try {
      const response = await fetch('/api/integrations/google-drive/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })

      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: 'Szinkronizálás sikeres',
          description: `${data.filesFound} fájl találva, ${data.filesImported} új fájl importálva`,
        })
        loadIntegration()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'Szinkronizálási hiba',
        description: error instanceof Error ? error.message : 'Ismeretlen hiba',
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleToggleAutoSync = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/integrations/google-drive', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_sync_enabled: enabled }),
      })

      if (response.ok) {
        setIntegration(prev => prev ? { ...prev, auto_sync_enabled: enabled } : null)
        toast({
          title: enabled ? 'Automatikus szinkronizálás bekapcsolva' : 'Automatikus szinkronizálás kikapcsolva',
        })
      }
    } catch (error) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült módosítani a beállítást',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveFolder = async (folderId: string) => {
    try {
      const response = await fetch('/api/integrations/google-drive/folders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })

      if (response.ok) {
        loadIntegration()
        toast({
          title: 'Mappa eltávolítva',
        })
      }
    } catch (error) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült eltávolítani a mappát',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img src="/google-drive-icon.svg" alt="Google Drive" className="h-6 w-6" />
            Google Drive Integráció
          </CardTitle>
          <CardDescription>
            Automatikusan importálja és átírja a Google Drive mappáiban található hang- és videófájlokat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!integration ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                Kapcsolja össze Google Drive fiókját a gyors fájl importáláshoz
              </p>
              <Button onClick={handleAuth} disabled={authenticating}>
                {authenticating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Kapcsolódás...
                  </>
                ) : (
                  'Google Drive kapcsolása'
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Connection Status */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-600" />
                  <span className="font-medium">Google Drive kapcsolódva</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUploader(!showUploader)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Fájlok feltöltése
                </Button>
              </div>

              {/* Uppy Dashboard */}
              {showUploader && (
                <div className="border rounded-lg p-4">
                  <Dashboard
                    uppy={uppy}
                    proudlyDisplayPoweredByUppy={false}
                    height={450}
                    showProgressDetails
                    note="Válasszon audio vagy video fájlokat a Google Drive-ból"
                  />
                </div>
              )}

              {/* Auto-sync Settings */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label className="text-base">Automatikus szinkronizálás</Label>
                  <p className="text-sm text-muted-foreground">
                    Új fájlok automatikus importálása a figyelt mappákból
                  </p>
                </div>
                <Switch
                  checked={integration.auto_sync_enabled}
                  onCheckedChange={handleToggleAutoSync}
                />
              </div>

              {/* Watched Folders */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Figyelt mappák</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Open folder selector
                      window.open(
                        `https://drive.google.com/drive/folders?usp=sharing`,
                        '_blank'
                      )
                      toast({
                        title: 'Mappa hozzáadása',
                        description: 'Válassza ki a mappát a Google Drive-ban, majd használja a megosztási linket',
                      })
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Mappa hozzáadása
                  </Button>
                </div>

                {integration.watched_folders.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Még nem adott hozzá figyelt mappákat. Adjon hozzá mappákat az automatikus importáláshoz.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {integration.watched_folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <FolderOpen className="h-5 w-5 text-blue-600" />
                          <div>
                            <p className="font-medium">{folder.name}</p>
                            {folder.lastSyncedAt && (
                              <p className="text-sm text-muted-foreground">
                                Utolsó szinkronizálás:{' '}
                                {formatDistanceToNow(new Date(folder.lastSyncedAt), {
                                  addSuffix: true,
                                  locale: hu,
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSync(folder.id)}
                            disabled={syncing}
                          >
                            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFolder(folder.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sync All Button */}
              {integration.watched_folders.length > 0 && (
                <Button
                  onClick={() => handleSync()}
                  disabled={syncing}
                  className="w-full"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Szinkronizálás...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Összes mappa szinkronizálása
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      {syncLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Szinkronizálási elQzmények</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {syncLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div className="flex items-center gap-3">
                    <FileAudio className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{log.folder_name}</p>
                      <p className="text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: hu,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {log.error ? (
                      <Badge variant="destructive">Hiba</Badge>
                    ) : (
                      <>
                        <p className="font-medium">
                          {log.files_imported}/{log.files_found} fájl
                        </p>
                        <p className="text-muted-foreground">importálva</p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}