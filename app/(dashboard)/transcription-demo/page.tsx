'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ModeSelector, TranscriptionMode } from '@/components/transcription/mode-selector'
import { LanguageSelector, SupportedLanguage } from '@/components/transcription/language-selector'
import { TranscriptionStatus } from '@/components/transcription/transcription-status'
import { ChunkedUploadDialog } from '@/components/upload/chunked-upload-dialog'
import { useToast } from '@/components/ui/use-toast'
import { 
  FileAudio, 
  Languages, 
  Zap, 
  Brain,
  Upload,
  Play,
  Settings,
  Info
} from 'lucide-react'

export default function TranscriptionDemoPage() {
  const [selectedMode, setSelectedMode] = useState<TranscriptionMode>('balanced')
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('hu')
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)
  const { toast } = useToast()
  
  // Demo organization ID
  const organizationId = 'demo-org-id'

  const handleStartTranscription = async () => {
    // This would normally trigger the transcription
    toast({
      title: 'Átírás elindítva',
      description: `${selectedMode} módban, ${selectedLanguage} nyelven`,
    })
    
    // Set a demo meeting ID
    setActiveMeetingId('demo-meeting-123')
  }

  const handleUploadSuccess = (meetingId: string) => {
    setActiveMeetingId(meetingId)
    setShowUploadDialog(false)
    
    toast({
      title: 'Fájl feltöltve',
      description: 'Az átírás automatikusan elindul',
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Átírás Demo</h1>
        <p className="text-muted-foreground mt-2">
          Tesztelje az OpenAI Whisper alapú átírási rendszert
        </p>
      </div>

      <Tabs defaultValue="setup" className="space-y-4">
        <TabsList>
          <TabsTrigger value="setup">Beállítás</TabsTrigger>
          <TabsTrigger value="status">Státusz</TabsTrigger>
          <TabsTrigger value="features">Funkciók</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>1. Fájl feltöltése</CardTitle>
              <CardDescription>
                Töltsön fel egy audio vagy videó fájlt az átíráshoz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Fájl feltöltése
              </Button>
            </CardContent>
          </Card>

          {/* Language Selection */}
          <Card>
            <CardHeader>
              <CardTitle>2. Nyelv kiválasztása</CardTitle>
              <CardDescription>
                Válassza ki a felvétel nyelvét vagy használja az automatikus felismerést
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LanguageSelector
                value={selectedLanguage}
                onChange={setSelectedLanguage}
                showAutoDetect={true}
                meetingId={activeMeetingId || undefined}
              />
            </CardContent>
          </Card>

          {/* Mode Selection */}
          <Card>
            <CardHeader>
              <CardTitle>3. Átírási mód</CardTitle>
              <CardDescription>
                Válassza ki a megfelelő pontosság-sebesség egyensúlyt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ModeSelector
                selectedMode={selectedMode}
                onModeChange={setSelectedMode}
              />
            </CardContent>
          </Card>

          {/* Start Button */}
          <div className="flex justify-center">
            <Button 
              size="lg" 
              onClick={handleStartTranscription}
              disabled={!activeMeetingId}
            >
              <Play className="mr-2 h-5 w-5" />
              Átírás indítása
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          {activeMeetingId ? (
            <>
              <TranscriptionStatus
                meetingId={activeMeetingId}
                onComplete={() => {
                  toast({
                    title: 'Átírás kész!',
                    description: 'A dokumentum sikeresen feldolgozva',
                  })
                }}
              />
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Meeting ID: {activeMeetingId}
                </AlertDescription>
              </Alert>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Még nincs aktív átírás. Töltsön fel egy fájlt a kezdéshez.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <span>Többszintű feldolgozás</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">Gyors mód</p>
                  <p className="text-sm text-muted-foreground">
                    1-2 perc / 10 perc audio • ~90% pontosság
                  </p>
                </div>
                <div>
                  <p className="font-medium">Kiegyensúlyozott mód</p>
                  <p className="text-sm text-muted-foreground">
                    3-5 perc / 10 perc audio • ~95% pontosság
                  </p>
                </div>
                <div>
                  <p className="font-medium">Precíziós mód</p>
                  <p className="text-sm text-muted-foreground">
                    8-12 perc / 10 perc audio • ~98% pontosság
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Languages className="h-5 w-5 text-green-500" />
                  <span>Többnyelvű támogatás</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• 10 támogatott nyelv</li>
                  <li>• Automatikus nyelvfelismerés</li>
                  <li>• Nyelv-specifikus optimalizáció</li>
                  <li>• Magyar üzleti kifejezések</li>
                  <li>• Kevert nyelvű meetingek</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <span>Intelligens funkciók</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Beszélő azonosítás</li>
                  <li>• Időbélyegek</li>
                  <li>• Automatikus javítások</li>
                  <li>• Szaknyelvi optimalizáció</li>
                  <li>• Kontextus alapú pontosítás</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-orange-500" />
                  <span>Megbízhatóság</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Automatikus újrapróbálkozás</li>
                  <li>• Hiba kezelés</li>
                  <li>• Folyamat követés</li>
                  <li>• Webhook értesítések</li>
                  <li>• Email értesítések</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>API használat</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
{`// Átírás indítása
const response = await fetch('/api/meetings/upload', {
  method: 'POST',
  body: formData // file, mode, language
})

// Folyamat követése
const eventSource = new EventSource(
  \`/api/meetings/\${meetingId}/transcription-progress\`
)

eventSource.onmessage = (event) => {
  const { status, progress } = JSON.parse(event.data)
  console.log(\`Status: \${status}, Progress: \${progress}%\`)
}`}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ChunkedUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onSuccess={handleUploadSuccess}
        organizationId={organizationId}
      />
    </div>
  )
}