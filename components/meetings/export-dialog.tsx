'use client'

import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  FileDown, 
  Download,
  Briefcase,
  Scale,
  Heart,
  Settings,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { ExportPreview } from './export-preview'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingId: string
  meetingTitle: string
}

interface ExportOptions {
  format: 'pdf' | 'docx' | 'txt'
  template: 'business' | 'legal' | 'medical' | 'custom'
  includeBranding: boolean
  includeTranscript: boolean
  includeSummary: boolean
  includeActionItems: boolean
  includeMetadata: boolean
}

const formatIcons = {
  pdf: FileDown,
  docx: FileText,
  txt: FileText
}

const templateIcons = {
  business: Briefcase,
  legal: Scale,
  medical: Heart,
  custom: Settings
}

export function ExportDialog({ 
  open, 
  onOpenChange, 
  meetingId,
  meetingTitle 
}: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [options, setOptions] = useState<ExportOptions>({
    format: 'pdf',
    template: 'business',
    includeBranding: true,
    includeTranscript: true,
    includeSummary: true,
    includeActionItems: true,
    includeMetadata: true
  })

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      const response = await fetch(`/api/meetings/${meetingId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const filename = filenameMatch ? filenameMatch[1] : `${meetingTitle}.${options.format}`

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Dokumentum sikeresen exportálva')
      onOpenChange(false)
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : 'Export sikertelen')
    } finally {
      setIsExporting(false)
    }
  }

  const formatInfo = {
    pdf: {
      name: 'PDF',
      description: 'Professzionális megjelenés, nyomtatásra optimalizált',
      features: ['Márkajelzés támogatás', 'Vízjel opció', 'Nyomtatásbarát']
    },
    docx: {
      name: 'Word',
      description: 'Szerkeszthető dokumentum Microsoft Word formátumban',
      features: ['Szerkeszthető', 'Formázás megtartása', 'Sablonok támogatása']
    },
    txt: {
      name: 'Egyszerű szöveg',
      description: 'Tiszta szöveg formázás nélkül',
      features: ['Univerzális kompatibilitás', 'Kis fájlméret', 'Egyszerű archiválás']
    }
  }

  const templateInfo = {
    business: {
      name: 'Üzleti sablon',
      description: 'Professzionális megjelenés üzleti meetingekhez',
      sections: ['Vezetői összefoglaló', 'Döntések', 'Teendők', 'Részletes jegyzőkönyv']
    },
    legal: {
      name: 'Jogi sablon',
      description: 'Részletes dokumentáció jogi megfelelőséggel',
      sections: ['Bizalmas fejléc', 'Ügyvédi összefoglaló', 'Teljes átírat', 'Jogi nyilatkozat']
    },
    medical: {
      name: 'Egészségügyi sablon',
      description: 'GDPR-konform orvosi dokumentáció',
      sections: ['Titoktartási figyelmeztetés', 'Klinikai összefoglaló', 'Kezelési terv', 'Konzultációs jegyzet']
    },
    custom: {
      name: 'Egyéni sablon',
      description: 'Testreszabható sablon az Ön igényei szerint',
      sections: ['Választható szakaszok', 'Egyéni formázás', 'Rugalmas elrendezés']
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Dokumentum exportálása</DialogTitle>
          <DialogDescription>
            Válassza ki a formátumot és testreszabási opciókat
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="format" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="format">Formátum</TabsTrigger>
            <TabsTrigger value="template">Sablon</TabsTrigger>
            <TabsTrigger value="options">Opciók</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto py-4">
            <TabsContent value="format" className="space-y-4 mt-0">
              <RadioGroup 
                value={options.format} 
                onValueChange={(value) => setOptions({ ...options, format: value as any })}
              >
                {(['pdf', 'docx', 'txt'] as const).map((format) => {
                  const Icon = formatIcons[format]
                  const info = formatInfo[format]
                  
                  return (
                    <Card key={format} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <label htmlFor={format} className="flex items-start gap-4 cursor-pointer">
                          <RadioGroupItem value={format} id={format} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-5 w-5 text-blue-600" />
                              <span className="font-semibold">{info.name}</span>
                              {format === 'pdf' && (
                                <Badge variant="secondary" className="text-xs">Ajánlott</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {info.description}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {info.features.map((feature) => (
                                <span key={feature} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {feature}
                                </span>
                              ))}
                            </div>
                          </div>
                        </label>
                      </CardContent>
                    </Card>
                  )
                })}
              </RadioGroup>
            </TabsContent>

            <TabsContent value="template" className="space-y-4 mt-0">
              <RadioGroup 
                value={options.template} 
                onValueChange={(value) => setOptions({ ...options, template: value as any })}
              >
                {(['business', 'legal', 'medical', 'custom'] as const).map((template) => {
                  const Icon = templateIcons[template]
                  const info = templateInfo[template]
                  
                  return (
                    <Card key={template} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <label htmlFor={`template-${template}`} className="flex items-start gap-4 cursor-pointer">
                          <RadioGroupItem value={template} id={`template-${template}`} className="mt-1" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-5 w-5 text-blue-600" />
                              <span className="font-semibold">{info.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {info.description}
                            </p>
                            <div className="space-y-1">
                              {info.sections.map((section) => (
                                <div key={section} className="flex items-center gap-2 text-xs text-gray-600">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  <span>{section}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </label>
                      </CardContent>
                    </Card>
                  )
                })}
              </RadioGroup>
            </TabsContent>

            <TabsContent value="options" className="space-y-4 mt-0">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <h3 className="font-semibold mb-2">Tartalom beállítások</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="branding"
                        checked={options.includeBranding}
                        onCheckedChange={(checked) => 
                          setOptions({ ...options, includeBranding: checked as boolean })
                        }
                      />
                      <Label htmlFor="branding" className="flex-1 cursor-pointer">
                        <span className="font-medium">Szervezeti márkajelzés</span>
                        <p className="text-sm text-muted-foreground">
                          Logo, cégnév és elérhetőségek megjelenítése
                        </p>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="summary"
                        checked={options.includeSummary}
                        onCheckedChange={(checked) => 
                          setOptions({ ...options, includeSummary: checked as boolean })
                        }
                      />
                      <Label htmlFor="summary" className="flex-1 cursor-pointer">
                        <span className="font-medium">AI összefoglaló</span>
                        <p className="text-sm text-muted-foreground">
                          Automatikusan generált összefoglaló
                        </p>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="actionItems"
                        checked={options.includeActionItems}
                        onCheckedChange={(checked) => 
                          setOptions({ ...options, includeActionItems: checked as boolean })
                        }
                      />
                      <Label htmlFor="actionItems" className="flex-1 cursor-pointer">
                        <span className="font-medium">Akció pontok</span>
                        <p className="text-sm text-muted-foreground">
                          Teendők, felelősök és határidők
                        </p>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="transcript"
                        checked={options.includeTranscript}
                        onCheckedChange={(checked) => 
                          setOptions({ ...options, includeTranscript: checked as boolean })
                        }
                      />
                      <Label htmlFor="transcript" className="flex-1 cursor-pointer">
                        <span className="font-medium">Teljes átírat</span>
                        <p className="text-sm text-muted-foreground">
                          A beszélgetés szó szerinti leirata
                        </p>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="metadata"
                        checked={options.includeMetadata}
                        onCheckedChange={(checked) => 
                          setOptions({ ...options, includeMetadata: checked as boolean })
                        }
                      />
                      <Label htmlFor="metadata" className="flex-1 cursor-pointer">
                        <span className="font-medium">Meeting adatok</span>
                        <p className="text-sm text-muted-foreground">
                          Dátum, időtartam, résztvevők
                        </p>
                      </Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Preview info */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">Előnézet</p>
                      <p className="text-blue-700">
                        A dokumentum végleges megjelenése a választott sablon és opciók alapján kerül generálásra.
                        {options.format === 'pdf' && ' A PDF formátum professzionális megjelenést biztosít nyomtatáshoz.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(true)}
            disabled={isExporting}
          >
            <Eye className="h-4 w-4 mr-2" />
            Előnézet
          </Button>
          <Button 
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportálás...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportálás
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Export Preview Dialog */}
    <ExportPreview
      open={showPreview}
      onOpenChange={setShowPreview}
      meetingId={meetingId}
      options={options}
      onExport={handleExport}
    />
    </>
  )
}