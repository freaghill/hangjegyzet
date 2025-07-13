'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChunkedUploadDialog } from '@/components/upload/chunked-upload-dialog'
import { UploadButton } from '@/components/meetings/upload-button'
import { OngoingUploads } from '@/components/upload/ongoing-uploads'
import { 
  Upload, 
  FileAudio, 
  Zap, 
  Shield, 
  CheckCircle2,
  Info,
  Server,
  HardDrive
} from 'lucide-react'

export default function UploadDemoPage() {
  const [showChunkedDialog, setShowChunkedDialog] = useState(false)
  const [uploadedMeetingId, setUploadedMeetingId] = useState<string | null>(null)
  
  // This should come from user context
  const organizationId = 'demo-org-id'

  const handleUploadSuccess = (meetingId: string) => {
    setUploadedMeetingId(meetingId)
    setShowChunkedDialog(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fájl feltöltés demo</h1>
        <p className="text-muted-foreground mt-2">
          Tesztelje a nagy fájlok feltöltését chunked upload technológiával
        </p>
      </div>

      {uploadedMeetingId && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Sikeres feltöltés! Meeting ID: {uploadedMeetingId}
          </AlertDescription>
        </Alert>
      )}

      <OngoingUploads organizationId={organizationId} />

      <Tabs defaultValue="upload" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upload">Feltöltés</TabsTrigger>
          <TabsTrigger value="features">Funkciók</TabsTrigger>
          <TabsTrigger value="technical">Technikai részletek</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fájl feltöltés</CardTitle>
              <CardDescription>
                Válasszon ki egy audio vagy videó fájlt a feltöltéshez
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <UploadButton
                  organizationId={organizationId}
                  onSuccess={handleUploadSuccess}
                />
                <Button
                  variant="outline"
                  onClick={() => setShowChunkedDialog(true)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Nagy fájl feltöltése (chunked)
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-3">
                      <FileAudio className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">Normál feltöltés</p>
                        <p className="text-sm text-muted-foreground">
                          Fájlok 500MB-ig
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-3">
                      <HardDrive className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="font-medium">Chunked feltöltés</p>
                        <p className="text-sm text-muted-foreground">
                          Fájlok 2GB-ig, folytatható
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chunked Upload funkciók</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Folytatható feltöltés</p>
                    <p className="text-sm text-muted-foreground">
                      Megszakítás esetén folytatható ahol abbahagyta
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Párhuzamos feltöltés</p>
                    <p className="text-sm text-muted-foreground">
                      5MB-os chunkok párhuzamos feltöltése
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Integritás ellenőrzés</p>
                    <p className="text-sm text-muted-foreground">
                      MD5 hash minden chunk-hoz
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Server className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="font-medium">24 órás session</p>
                    <p className="text-sm text-muted-foreground">
                      A feltöltés 24 óráig folytatható
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  A rendszer automatikusan választ a normál és chunked feltöltés között
                  a fájl mérete alapján (100MB felett chunked).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technikai implementáció</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">API végpontok</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li><code>/api/meetings/upload/chunk</code> - Chunk feltöltés</li>
                    <li><code>/api/meetings/upload/finalize</code> - Feltöltés véglegesítése</li>
                    <li><code>/api/meetings/upload/status</code> - Státusz lekérdezés</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Adatbázis táblák</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li><code>upload_sessions</code> - Feltöltési munkamenetek</li>
                    <li><code>upload_chunks</code> - Chunk metaadatok</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Fájl kezelés</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Ideiglenes tárolás: <code>/tmp/hangjegyzet-uploads/</code></li>
                    <li>Végleges tárolás: Supabase Storage <code>meetings</code> bucket</li>
                    <li>Automatikus tisztítás lejárt feltöltéseknél</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Biztonsági funkciók</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Felhasználó authentikáció minden chunk-nál</li>
                    <li>Organization-alapú hozzáférés vezérlés</li>
                    <li>Chunk méret limit (10MB)</li>
                    <li>Fájl típus validáció</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ChunkedUploadDialog
        open={showChunkedDialog}
        onOpenChange={setShowChunkedDialog}
        onSuccess={handleUploadSuccess}
        organizationId={organizationId}
      />
    </div>
  )
}