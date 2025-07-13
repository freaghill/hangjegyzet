'use client'

import { useEffect, useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  X, 
  Loader2,
  Download,
  FileText,
  Building,
  Calendar,
  Clock,
  Users
} from 'lucide-react'
import { ExportOptions } from '@/lib/export/types'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'

interface ExportPreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingId: string
  options: ExportOptions
  onExport: () => void
}

export function ExportPreview({ 
  open, 
  onOpenChange, 
  meetingId,
  options,
  onExport
}: ExportPreviewProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [meetingData, setMeetingData] = useState<any>(null)
  const [branding, setBranding] = useState<any>(null)

  useEffect(() => {
    if (open) {
      loadPreview()
    }
  }, [open, meetingId, options])

  const loadPreview = async () => {
    setIsLoading(true)
    try {
      // Fetch meeting data
      const meetingResponse = await fetch(`/api/meetings/${meetingId}`)
      const meeting = await meetingResponse.json()
      setMeetingData(meeting)

      // Fetch organization branding
      const brandingResponse = await fetch('/api/organizations/branding')
      const brandingData = await brandingResponse.json()
      setBranding(brandingData)

      // Generate preview HTML
      const previewResponse = await fetch(`/api/meetings/${meetingId}/export/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })
      
      if (!previewResponse.ok) throw new Error('Preview generation failed')
      
      const html = await previewResponse.text()
      setPreviewHtml(html)
    } catch (error) {
      console.error('Preview error:', error)
      setPreviewHtml('<p class="text-center text-red-500">Előnézet betöltése sikertelen</p>')
    } finally {
      setIsLoading(false)
    }
  }

  const getTemplateStyles = () => {
    switch (options.template) {
      case 'legal':
        return {
          primary: '#1a365d',
          secondary: '#2d3748',
          headerBg: '#f7fafc',
          borderColor: '#e2e8f0'
        }
      case 'medical':
        return {
          primary: '#047857',
          secondary: '#064e3b',
          headerBg: '#ecfdf5',
          borderColor: '#d1fae5'
        }
      case 'business':
      default:
        return {
          primary: branding?.primaryColor || '#2563eb',
          secondary: branding?.secondaryColor || '#64748b',
          headerBg: '#f3f4f6',
          borderColor: '#e5e7eb'
        }
    }
  }

  const renderPreviewContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-4 p-8">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="space-y-2 mt-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      )
    }

    if (previewHtml) {
      return (
        <div 
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )
    }

    // Fallback rendered preview
    const styles = getTemplateStyles()
    
    return (
      <div className="p-8 bg-white">
        {/* Header */}
        {options.includeBranding && branding && (
          <div className="mb-8 pb-4 border-b" style={{ borderColor: styles.borderColor }}>
            <div className="flex justify-between items-start">
              <div>
                {branding.logoUrl && (
                  <img 
                    src={branding.logoUrl} 
                    alt={branding.companyName} 
                    className="h-12 mb-2"
                  />
                )}
                <h1 className="text-2xl font-bold" style={{ color: styles.primary }}>
                  {branding.companyName}
                </h1>
              </div>
              {options.includeBranding && branding.includeContactInfo && (
                <div className="text-right text-sm" style={{ color: styles.secondary }}>
                  {branding.contactInfo?.email && <p>{branding.contactInfo.email}</p>}
                  {branding.contactInfo?.phone && <p>{branding.contactInfo.phone}</p>}
                  {branding.contactInfo?.website && <p>{branding.contactInfo.website}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Document Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2" style={{ color: styles.primary }}>
            {meetingData?.title || 'Meeting jegyzőkönyv'}
          </h2>
          
          {/* Metadata */}
          {options.includeMetadata && (
            <div className="flex flex-wrap gap-4 text-sm" style={{ color: styles.secondary }}>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {meetingData?.created_at 
                    ? format(new Date(meetingData.created_at), 'yyyy. MMMM d.', { locale: hu })
                    : 'Dátum'
                  }
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{meetingData?.duration || '0'} perc</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{meetingData?.speakers?.length || 0} résztvevő</span>
              </div>
            </div>
          )}
        </div>

        {/* Template-specific content */}
        {options.template === 'legal' && (
          <div 
            className="mb-6 p-4 rounded" 
            style={{ backgroundColor: styles.headerBg, border: `1px solid ${styles.borderColor}` }}
          >
            <p className="font-semibold text-sm uppercase tracking-wide" style={{ color: styles.primary }}>
              Bizalmas dokumentum
            </p>
            <p className="text-xs mt-1" style={{ color: styles.secondary }}>
              Ez a dokumentum bizalmas információkat tartalmaz és kizárólag a címzett számára készült.
            </p>
          </div>
        )}

        {options.template === 'medical' && (
          <div 
            className="mb-6 p-4 rounded" 
            style={{ backgroundColor: styles.headerBg, border: `1px solid ${styles.borderColor}` }}
          >
            <p className="font-semibold text-sm" style={{ color: styles.primary }}>
              Egészségügyi dokumentum - GDPR védett
            </p>
            <p className="text-xs mt-1" style={{ color: styles.secondary }}>
              Ez a dokumentum egészségügyi adatokat tartalmaz, kezelése a GDPR előírásai szerint történik.
            </p>
          </div>
        )}

        {/* Summary */}
        {options.includeSummary && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-3" style={{ color: styles.primary }}>
              Összefoglaló
            </h3>
            <p style={{ color: styles.secondary }}>
              {meetingData?.summary || 'Az AI által generált összefoglaló itt jelenik meg...'}
            </p>
          </div>
        )}

        {/* Action Items */}
        {options.includeActionItems && meetingData?.action_items?.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-3" style={{ color: styles.primary }}>
              Akció pontok
            </h3>
            <ul className="space-y-2">
              {meetingData.action_items.slice(0, 3).map((item: any, index: number) => (
                <li key={index} className="flex items-start gap-2">
                  <span style={{ color: styles.primary }}>•</span>
                  <div>
                    <p style={{ color: styles.secondary }}>{item.task}</p>
                    {item.assignee && (
                      <p className="text-sm" style={{ color: styles.secondary }}>
                        Felelős: {item.assignee}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Transcript preview */}
        {options.includeTranscript && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-3" style={{ color: styles.primary }}>
              Átírat
            </h3>
            <p className="text-sm italic" style={{ color: styles.secondary }}>
              A teljes átírat az exportált dokumentumban lesz elérhető...
            </p>
          </div>
        )}

        {/* Footer */}
        {branding?.footerText && (
          <div 
            className="mt-12 pt-4 border-t text-center text-sm"
            style={{ borderColor: styles.borderColor, color: styles.secondary }}
          >
            <p>{branding.footerText}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dokumentum előnézet
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-8rem)]">
          <div className="bg-gray-100 min-h-full p-8">
            <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
              {renderPreviewContent()}
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Ez egy előnézet. A végleges dokumentum formázása eltérhet.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Bezárás
            </Button>
            <Button onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportálás
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}