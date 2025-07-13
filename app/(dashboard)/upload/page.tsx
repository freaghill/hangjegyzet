'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileAudio, 
  Zap, 
  Scale, 
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  HardDrive,
  Info
} from 'lucide-react'
import { UploadDialog } from '@/components/meetings/upload-dialog'
import { useOrganization } from '@/hooks/useOrganization'
import { getSubscriptionPlan } from '@/lib/payments/subscription-plans'
import { toast } from 'sonner'

interface UploadHistory {
  id: string
  title: string
  uploadedAt: string
  size: number
  duration: number
  mode: 'fast' | 'balanced' | 'precision'
  status: 'completed' | 'processing' | 'failed'
}

export default function UploadPage() {
  const router = useRouter()
  const { organization } = useOrganization()
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([])
  
  const userPlan = organization ? getSubscriptionPlan(organization.subscription_tier) : undefined

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`
    }
    return `${(mb / 1024).toFixed(2)} GB`
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}ó ${minutes}p`
    }
    return `${minutes} perc`
  }

  const getModeDetails = (mode: string) => {
    switch (mode) {
      case 'fast':
        return {
          icon: <Zap className="h-5 w-5" />,
          name: 'Fast',
          description: 'Gyors átírás tiszta hangfelvételekhez',
          accuracy: '~95%',
          speed: '1-2 perc',
          bestFor: 'Tiszta hang, kevés beszélő',
          color: 'text-green-600'
        }
      case 'balanced':
        return {
          icon: <Scale className="h-5 w-5" />,
          name: 'Balanced',
          description: 'Optimális egyensúly sebesség és pontosság között',
          accuracy: '~97%',
          speed: '3-5 perc',
          bestFor: 'Üzleti meetingek, közepes minőség',
          color: 'text-blue-600'
        }
      case 'precision':
        return {
          icon: <Target className="h-5 w-5" />,
          name: 'Precision',
          description: 'Maximális pontosság kritikus tartalmakhoz',
          accuracy: '~99%',
          speed: '5-10 perc',
          bestFor: 'Jogi, orvosi, technikai tartalom',
          color: 'text-purple-600'
        }
      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Új meeting feltöltése</h1>
        <p className="text-gray-600 mt-2">
          Töltse fel audio vagy video fájlját és válasszon átírási módot
        </p>
      </div>

      {/* Upload Card */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Fájl feltöltése</CardTitle>
          <CardDescription>
            Támogatott formátumok: MP3, WAV, M4A, MP4, MOV, AVI • Max méret: 2GB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <UploadDialog userPlan={userPlan}>
              <div className="cursor-pointer">
                <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <p className="text-lg font-medium mb-2">Kattintson vagy húzza ide a fájlt</p>
                <p className="text-sm text-muted-foreground">
                  Több fájlt is feltölthet egyszerre
                </p>
              </div>
            </UploadDialog>
          </div>
        </CardContent>
      </Card>

      {/* Mode Comparison */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Átírási módok összehasonlítása</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['fast', 'balanced', 'precision'].map((mode) => {
            const details = getModeDetails(mode)
            if (!details) return null

            return (
              <Card key={mode} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  mode === 'fast' ? 'bg-green-600' :
                  mode === 'balanced' ? 'bg-blue-600' : 'bg-purple-600'
                }`} />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className={details.color}>{details.icon}</span>
                    {details.name}
                  </CardTitle>
                  <CardDescription>{details.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Pontosság</span>
                      <span className="font-medium">{details.accuracy}</span>
                    </div>
                    <Progress 
                      value={mode === 'fast' ? 95 : mode === 'balanced' ? 97 : 99} 
                      className="h-2"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>Feldolgozási idő: {details.speed}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground">Ideális: {details.bestFor}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Upload Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Tippek a legjobb eredményhez</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Használjon jó minőségű felvételt</p>
                <p className="text-sm text-muted-foreground">
                  Minimális háttérzaj, tiszta hang = jobb átírás
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Válassza a megfelelő módot</p>
                <p className="text-sm text-muted-foreground">
                  Fast mód egyszerű felvételekhez, Precision kritikus tartalmakhoz
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Ellenőrizze a fájlméretet</p>
                <p className="text-sm text-muted-foreground">
                  Maximum 2GB-os fájlok tölthetők fel, nagyobb fájlokat ossza fel
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Uploads */}
      {uploadHistory.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Legutóbbi feltöltések</h2>
          <div className="space-y-4">
            {uploadHistory.map((upload) => {
              const modeDetails = getModeDetails(upload.mode)
              return (
                <Card key={upload.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileAudio className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{upload.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>{formatFileSize(upload.size)}</span>
                            <span>•</span>
                            <span>{formatDuration(upload.duration)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              {modeDetails?.icon}
                              {modeDetails?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          upload.status === 'completed' ? 'default' :
                          upload.status === 'processing' ? 'secondary' : 'destructive'
                        }>
                          {upload.status === 'completed' ? 'Kész' :
                           upload.status === 'processing' ? 'Feldolgozás' : 'Sikertelen'}
                        </Badge>
                        {upload.status === 'completed' && (
                          <Button 
                            size="sm"
                            onClick={() => router.push(`/meetings/${upload.id}`)}
                          >
                            Megnyitás
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}