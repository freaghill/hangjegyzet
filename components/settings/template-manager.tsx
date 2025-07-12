'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TemplateStats } from './template-stats'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { MeetingTemplate, TemplateSection } from '@/lib/templates/meeting-templates'
import { TEMPLATE_ICONS, TEMPLATE_COLORS } from '@/lib/templates/default-templates'
import { Plus, Edit2, Trash2, Copy, Save, X, ChevronUp, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function TemplateManager() {
  const [templates, setTemplates] = useState<MeetingTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MeetingTemplate | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Form state for editing
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    sections: [] as TemplateSection[],
    prompts: {} as Record<string, string>,
    customPrompts: [] as string[],
    analysisConfig: {
      extractActionItems: true,
      generateSummary: true,
      identifySections: true,
      trackMetrics: true,
    }
  })

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/templates')
      const data = await response.json()
      
      if (response.ok) {
        setTemplates(data.templates)
      } else {
        toast.error('Nem sikerült betölteni a sablonokat')
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      toast.error('Hiba történt a sablonok betöltésekor')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({
      name: '',
      slug: '',
      description: '',
      sections: [{ name: '', description: '', required: false }],
      prompts: { summary: '', actionItems: '' },
      customPrompts: [],
      analysisConfig: {
        extractActionItems: true,
        generateSummary: true,
        identifySections: true,
        trackMetrics: true,
      }
    })
    setEditingTemplate(null)
    setShowCreateDialog(true)
  }

  const handleEdit = (template: MeetingTemplate) => {
    setFormData({
      name: template.name,
      slug: template.slug,
      description: template.description || '',
      sections: template.sections,
      prompts: template.prompts,
      customPrompts: template.analysis_config.customPrompts,
      analysisConfig: {
        extractActionItems: template.analysis_config.extractActionItems,
        generateSummary: template.analysis_config.generateSummary,
        identifySections: template.analysis_config.identifySections,
        trackMetrics: template.analysis_config.trackMetrics,
      }
    })
    setEditingTemplate(template)
    setShowCreateDialog(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('A név és az azonosító kötelező')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        sections: formData.sections.filter(s => s.name),
        prompts: formData.prompts,
        analysis_config: {
          ...formData.analysisConfig,
          customPrompts: formData.customPrompts.filter(p => p)
        }
      }

      let response
      if (editingTemplate) {
        response = await fetch('/api/templates', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId: editingTemplate.id, ...payload })
        })
      } else {
        response = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (response.ok) {
        toast.success(editingTemplate ? 'Sablon frissítve' : 'Sablon létrehozva')
        setShowCreateDialog(false)
        loadTemplates()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Hiba történt a mentés során')
      }
    } catch (error) {
      console.error('Error saving template:', error)
      toast.error('Hiba történt a mentés során')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates?id=${templateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Sablon törölve')
        loadTemplates()
      } else {
        toast.error('Nem sikerült törölni a sablont')
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error('Hiba történt a törlés során')
    } finally {
      setDeleteConfirm(null)
    }
  }

  const addSection = () => {
    setFormData({
      ...formData,
      sections: [...formData.sections, { name: '', description: '', required: false }]
    })
  }

  const removeSection = (index: number) => {
    setFormData({
      ...formData,
      sections: formData.sections.filter((_, i) => i !== index)
    })
  }

  const updateSection = (index: number, field: keyof TemplateSection, value: any) => {
    const newSections = [...formData.sections]
    newSections[index] = { ...newSections[index], [field]: value }
    setFormData({ ...formData, sections: newSections })
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...formData.sections]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex >= 0 && newIndex < newSections.length) {
      [newSections[index], newSections[newIndex]] = [newSections[newIndex], newSections[index]]
      setFormData({ ...formData, sections: newSections })
    }
  }

  const addCustomPrompt = () => {
    setFormData({
      ...formData,
      customPrompts: [...formData.customPrompts, '']
    })
  }

  const updateCustomPrompt = (index: number, value: string) => {
    const newPrompts = [...formData.customPrompts]
    newPrompts[index] = value
    setFormData({ ...formData, customPrompts: newPrompts })
  }

  const removeCustomPrompt = (index: number) => {
    setFormData({
      ...formData,
      customPrompts: formData.customPrompts.filter((_, i) => i !== index)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Stats Section */}
      <TemplateStats />

      {/* Templates Management */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Meeting sablonok</h3>
            <p className="text-sm text-muted-foreground">
              Testreszabott sablonok létrehozása és kezelése különböző meeting típusokhoz
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Új sablon
          </Button>
        </div>

      <Tabs defaultValue="organization" className="space-y-4">
        <TabsList>
          <TabsTrigger value="organization">Szervezeti sablonok</TabsTrigger>
          <TabsTrigger value="default">Alapértelmezett sablonok</TabsTrigger>
        </TabsList>

        <TabsContent value="organization" className="space-y-4">
          {templates.filter(t => t.organization_id && !t.is_default).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  Még nincsenek egyedi sablonok létrehozva
                </p>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Első sablon létrehozása
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {templates
                .filter(t => t.organization_id && !t.is_default)
                .map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => handleEdit(template)}
                    onDelete={() => setDeleteConfirm(template.id)}
                    canEdit={true}
                  />
                ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="default" className="space-y-4">
          <div className="grid gap-4">
            {templates
              .filter(t => t.is_default)
              .map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  canEdit={false}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Sablon szerkesztése' : 'Új sablon létrehozása'}
            </DialogTitle>
            <DialogDescription>
              Hozzon létre testreszabott sablont a szervezete meeting típusaihoz
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Sablon neve</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="pl. Heti vezetői értekezlet"
                />
              </div>

              <div>
                <Label htmlFor="slug">Azonosító</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="pl. heti-vezetoi"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Egyedi azonosító, csak betűk, számok és kötőjel
                </p>
              </div>

              <div>
                <Label htmlFor="description">Leírás</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mire használható ez a sablon?"
                  rows={2}
                />
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Meeting szakaszok</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSection}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Szakasz hozzáadása
                </Button>
              </div>

              <div className="space-y-3">
                {formData.sections.map((section, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input
                            value={section.name}
                            onChange={(e) => updateSection(index, 'name', e.target.value)}
                            placeholder="Szakasz neve"
                            className="flex-1"
                          />
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveSection(index, 'up')}
                              disabled={index === 0}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveSection(index, 'down')}
                              disabled={index === formData.sections.length - 1}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSection(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <Input
                          value={section.description}
                          onChange={(e) => updateSection(index, 'description', e.target.value)}
                          placeholder="Szakasz leírása"
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={section.required || false}
                            onCheckedChange={(checked) => updateSection(index, 'required', checked)}
                          />
                          <Label className="text-sm font-normal">Kötelező szakasz</Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Analysis prompts */}
            <div className="space-y-4">
              <Label>Elemzési promptok</Label>
              
              <div>
                <Label htmlFor="summary-prompt" className="text-sm">Összefoglaló prompt</Label>
                <Textarea
                  id="summary-prompt"
                  value={formData.prompts.summary || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompts: { ...formData.prompts, summary: e.target.value }
                  })}
                  placeholder="Mi alapján készüljön az összefoglaló?"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="action-prompt" className="text-sm">Akciók prompt</Label>
                <Textarea
                  id="action-prompt"
                  value={formData.prompts.actionItems || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    prompts: { ...formData.prompts, actionItems: e.target.value }
                  })}
                  placeholder="Hogyan azonosítsa az akciókat?"
                  rows={2}
                />
              </div>
            </div>

            {/* Custom prompts */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Egyedi elemzések</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomPrompt}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Hozzáadás
                </Button>
              </div>

              <div className="space-y-2">
                {formData.customPrompts.map((prompt, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={prompt}
                      onChange={(e) => updateCustomPrompt(index, e.target.value)}
                      placeholder="Egyedi elemzési szempont"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomPrompt(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis config */}
            <div className="space-y-4">
              <Label>Elemzési beállítások</Label>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.analysisConfig.extractActionItems}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      analysisConfig: { ...formData.analysisConfig, extractActionItems: checked }
                    })}
                  />
                  <Label className="text-sm font-normal">Akciók automatikus kinyerése</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.analysisConfig.generateSummary}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      analysisConfig: { ...formData.analysisConfig, generateSummary: checked }
                    })}
                  />
                  <Label className="text-sm font-normal">Összefoglaló generálása</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.analysisConfig.identifySections}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      analysisConfig: { ...formData.analysisConfig, identifySections: checked }
                    })}
                  />
                  <Label className="text-sm font-normal">Szakaszok automatikus felismerése</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.analysisConfig.trackMetrics}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      analysisConfig: { ...formData.analysisConfig, trackMetrics: checked }
                    })}
                  />
                  <Label className="text-sm font-normal">Meeting metrikák követése</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={saving}
            >
              Mégse
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Mentés...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Mentés
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sablon törlése</DialogTitle>
            <DialogDescription>
              Biztosan törölni szeretné ezt a sablont? Ez a művelet nem vonható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Mégse
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}

interface TemplateCardProps {
  template: MeetingTemplate
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
}

function TemplateCard({ template, onEdit, onDelete, canEdit }: TemplateCardProps) {
  const icon = TEMPLATE_ICONS[template.template_type] || TEMPLATE_ICONS.custom
  const color = TEMPLATE_COLORS[template.template_type] || TEMPLATE_COLORS.custom

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              {template.description && (
                <CardDescription className="mt-1">
                  {template.description}
                </CardDescription>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                `bg-${color}-100`,
                `text-${color}-800`
              )}
            >
              {template.template_type === 'custom' ? 'Egyedi' : 'Alapértelmezett'}
            </Badge>
            
            {canEdit && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEdit}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-1">Szakaszok ({template.sections.length})</p>
            <div className="flex flex-wrap gap-1">
              {template.sections.map((section, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {section.name}
                  {section.required && ' *'}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex gap-4 text-xs text-muted-foreground">
            {template.analysis_config.extractActionItems && (
              <span>✓ Akciók</span>
            )}
            {template.analysis_config.generateSummary && (
              <span>✓ Összefoglaló</span>
            )}
            {template.analysis_config.identifySections && (
              <span>✓ Szakaszok</span>
            )}
            {template.analysis_config.trackMetrics && (
              <span>✓ Metrikák</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}