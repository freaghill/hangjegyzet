'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { templateManager, MeetingTemplate } from '@/lib/templates/meeting-templates'
import { TEMPLATE_ICONS, TEMPLATE_COLORS } from '@/lib/templates/default-templates'
import { useOrganization } from '@/hooks/useOrganization'
import { Loader2, Info, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TemplateSelectorProps {
  onSelect: (templateId: string | null) => void
  selectedTemplateId?: string | null
  showDescription?: boolean
  className?: string
}

export function TemplateSelector({
  onSelect,
  selectedTemplateId,
  showDescription = true,
  className
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<MeetingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(selectedTemplateId || null)
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const { organization } = useOrganization()

  useEffect(() => {
    if (organization?.id) {
      loadTemplates()
    }
  }, [organization?.id])

  const loadTemplates = async () => {
    if (!organization?.id) return
    
    setLoading(true)
    try {
      const fetchedTemplates = await templateManager.getTemplates(organization.id)
      setTemplates(fetchedTemplates)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (templateId: string) => {
    const newValue = templateId === 'none' ? null : templateId
    setSelectedTemplate(newValue)
    onSelect(newValue)
  }

  const getTemplateIcon = (template: MeetingTemplate) => {
    return TEMPLATE_ICONS[template.template_type] || TEMPLATE_ICONS.custom
  }

  const getTemplateColor = (template: MeetingTemplate) => {
    return TEMPLATE_COLORS[template.template_type] || TEMPLATE_COLORS.custom
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <Label className="text-base font-semibold mb-3 block">
          Meeting sablon kiválasztása
        </Label>
        <p className="text-sm text-muted-foreground mb-4">
          Válasszon egy sablont a meeting típusához, vagy folytassa sablon nélkül
        </p>
      </div>

      <RadioGroup value={selectedTemplate || 'none'} onValueChange={handleSelect}>
        {/* No template option */}
        <Card className={cn(
          "p-4 cursor-pointer transition-colors",
          selectedTemplate === null && "border-primary"
        )}>
          <label className="flex items-start space-x-3 cursor-pointer">
            <RadioGroupItem value="none" className="mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Sablon nélkül</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Általános meeting elemzés alapértelmezett beállításokkal
              </p>
            </div>
          </label>
        </Card>

        {/* Template options */}
        {templates.map((template) => (
          <Card
            key={template.id}
            className={cn(
              "p-4 cursor-pointer transition-colors",
              selectedTemplate === template.id && "border-primary"
            )}
          >
            <label className="flex items-start space-x-3 cursor-pointer">
              <RadioGroupItem value={template.id} className="mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{getTemplateIcon(template)}</span>
                  <span className="font-medium">{template.name}</span>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs",
                      `bg-${getTemplateColor(template)}-100`,
                      `text-${getTemplateColor(template)}-800`
                    )}
                  >
                    {template.template_type === 'custom' ? 'Egyedi' : 'Alapértelmezett'}
                  </Badge>
                  {template.is_default && (
                    <Badge variant="outline" className="text-xs">
                      Ajánlott
                    </Badge>
                  )}
                </div>
                
                {showDescription && template.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {template.description}
                  </p>
                )}

                <div className="flex items-center gap-4 mt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowDetails(template.id)
                    }}
                  >
                    <Info className="h-3 w-3 mr-1" />
                    Részletek
                  </Button>
                  
                  {selectedTemplate === template.id && (
                    <span className="text-xs text-primary flex items-center">
                      <Check className="h-3 w-3 mr-1" />
                      Kiválasztva
                    </span>
                  )}
                </div>
              </div>
            </label>
          </Card>
        ))}
      </RadioGroup>

      {/* Template details dialog */}
      {showDetails && (
        <Dialog open={!!showDetails} onOpenChange={() => setShowDetails(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">
                  {getTemplateIcon(templates.find(t => t.id === showDetails)!)}
                </span>
                {templates.find(t => t.id === showDetails)?.name}
              </DialogTitle>
              <DialogDescription>
                {templates.find(t => t.id === showDetails)?.description}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div>
                <h4 className="font-medium mb-2">Várható szakaszok</h4>
                <div className="space-y-2">
                  {templates.find(t => t.id === showDetails)?.sections.map((section, idx) => (
                    <div key={idx} className="border-l-2 border-muted pl-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{section.name}</span>
                        {section.required && (
                          <Badge variant="outline" className="text-xs">Kötelező</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {section.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Elemzési beállítások</h4>
                <div className="space-y-1 text-sm">
                  {templates.find(t => t.id === showDetails)?.analysis_config.extractActionItems && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Akciók automatikus kinyerése</span>
                    </div>
                  )}
                  {templates.find(t => t.id === showDetails)?.analysis_config.generateSummary && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Összefoglaló generálása</span>
                    </div>
                  )}
                  {templates.find(t => t.id === showDetails)?.analysis_config.identifySections && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Szakaszok automatikus felismerése</span>
                    </div>
                  )}
                  {templates.find(t => t.id === showDetails)?.analysis_config.trackMetrics && (
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Meeting metrikák követése</span>
                    </div>
                  )}
                </div>
              </div>

              {templates.find(t => t.id === showDetails)?.analysis_config.customPrompts.length! > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Speciális elemzések</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    {templates.find(t => t.id === showDetails)?.analysis_config.customPrompts.map((prompt, idx) => (
                      <li key={idx}>{prompt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}