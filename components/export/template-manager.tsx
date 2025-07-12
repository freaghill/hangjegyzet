'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Download, FileText, FileCode, FileSpreadsheet, Eye, Edit, Copy, Trash2 } from 'lucide-react'
import { defaultTemplates } from '@/lib/export/templates/default-templates'

interface TemplateManagerProps {
  meetingId: string
  meetingTitle: string
}

export function TemplateManager({ meetingId, meetingTitle }: TemplateManagerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(defaultTemplates[0].id)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'docx' | 'html'>('pdf')
  const [isExporting, setIsExporting] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewContent, setPreviewContent] = useState('')

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      const response = await fetch(`/api/meetings/${meetingId}/export/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplate,
          format: exportFormat
        })
      })
      
      if (!response.ok) {
        throw new Error('Export failed')
      }
      
      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'export'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Export sikeres!')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export sikertelen')
    } finally {
      setIsExporting(false)
    }
  }

  const handlePreview = async (templateId: string) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/export/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId,
          format: 'html'
        })
      })
      
      if (!response.ok) {
        throw new Error('Preview failed')
      }
      
      const html = await response.text()
      setPreviewContent(html)
      setPreviewOpen(true)
    } catch (error) {
      console.error('Preview error:', error)
      toast.error('Előnézet betöltése sikertelen')
    }
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf':
        return <FileText className="w-4 h-4" />
      case 'docx':
        return <FileSpreadsheet className="w-4 h-4" />
      case 'html':
        return <FileCode className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'business':
        return 'bg-blue-500'
      case 'legal':
        return 'bg-purple-500'
      case 'medical':
        return 'bg-red-500'
      case 'education':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export sablonok</CardTitle>
          <CardDescription>
            Válasszon sablont a meeting exportálásához
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="default" className="space-y-4">
            <TabsList>
              <TabsTrigger value="default">Alapértelmezett sablonok</TabsTrigger>
              <TabsTrigger value="custom">Egyéni sablonok</TabsTrigger>
            </TabsList>
            
            <TabsContent value="default" className="space-y-4">
              <div className="grid gap-4">
                {defaultTemplates.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-all ${
                      selectedTemplate === template.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{template.name}</h4>
                            <Badge 
                              variant="secondary"
                              className={`${getCategoryColor(template.category)} text-white`}
                            >
                              {template.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {getFormatIcon(template.format)}
                              <span className="ml-1">{template.format.toUpperCase()}</span>
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePreview(template.id)
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="custom" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <p>Még nincs egyéni sablon</p>
                <Button variant="outline" className="mt-4">
                  Sablon létrehozása
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Export formátum</label>
                <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        PDF
                      </div>
                    </SelectItem>
                    <SelectItem value="docx">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="w-4 h-4" />
                        Word (DOCX)
                      </div>
                    </SelectItem>
                    <SelectItem value="html">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-4 h-4" />
                        HTML
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button
                onClick={handleExport}
                disabled={isExporting}
                className="mt-6"
              >
                <Download className="w-4 h-4 mr-2" />
                {isExporting ? 'Exportálás...' : 'Exportálás'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sablon előnézet</DialogTitle>
            <DialogDescription>
              Így fog kinézni az exportált dokumentum
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <iframe
              srcDoc={previewContent}
              className="w-full h-[60vh] border rounded"
              title="Template preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}