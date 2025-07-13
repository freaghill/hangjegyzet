'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Eye, 
  Send, 
  Code,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { EmailTemplateType } from '@/lib/email/types'
import { toast } from 'sonner'

const templates: { value: EmailTemplateType; label: string }[] = [
  { value: 'welcome', label: 'Üdvözlő email' },
  { value: 'transcription-complete', label: 'Átírás elkészült' },
  { value: 'payment-receipt', label: 'Fizetési visszaigazolás' },
  { value: 'team-invitation', label: 'Csapat meghívó' },
  { value: 'password-reset', label: 'Jelszó visszaállítás' },
  { value: 'email-verification', label: 'Email megerősítés' }
]

const defaultVariables: Record<EmailTemplateType, Record<string, any>> = {
  welcome: {
    userName: 'Teszt Felhasználó',
    dashboardUrl: 'https://hangjegyzet.hu/dashboard',
    supportEmail: 'support@hangjegyzet.hu',
    docsUrl: 'https://docs.hangjegyzet.hu'
  },
  'transcription-complete': {
    userName: 'Teszt Felhasználó',
    meetingTitle: 'Heti értekezlet - 2024.01.10',
    meetingUrl: 'https://hangjegyzet.hu/meetings/123',
    duration: '45 perc',
    language: 'Magyar',
    transcriptionMode: 'Kiegyensúlyozott',
    processingTime: '12 perc',
    summary: 'Ez egy példa összefoglaló a meeting főbb pontjairól.',
    keyPoints: ['Első főbb pont', 'Második főbb pont', 'Harmadik főbb pont'],
    speakers: [
      { name: 'Kovács János', duration: '20 perc' },
      { name: 'Nagy Anna', duration: '15 perc' },
      { name: 'Szabó Péter', duration: '10 perc' }
    ],
    speakerCount: 3,
    wordCount: 5432,
    sentenceCount: 234,
    paragraphCount: 45
  },
  'payment-receipt': {
    userName: 'Teszt Felhasználó',
    invoiceNumber: 'HJ-2024-00123',
    invoiceDate: '2024.01.10',
    invoiceUrl: 'https://hangjegyzet.hu/invoices/123.pdf',
    paymentMethod: 'Bankkártya',
    transactionId: 'TRX-123456789',
    items: [
      { name: 'Pro csomag - Havi előfizetés', quantity: 1, unitPrice: 9990, total: 9990 }
    ],
    netAmount: 7866,
    vatRate: 27,
    vatAmount: 2124,
    totalAmount: 9990,
    billingAddress: {
      name: 'Teszt Vállalat Kft.',
      taxNumber: '12345678-2-42',
      address: 'Teszt utca 123.',
      city: 'Budapest',
      postalCode: '1111',
      country: 'Magyarország'
    },
    subscription: {
      planName: 'Pro csomag',
      period: '2024.01.10 - 2024.02.10',
      nextBillingDate: '2024.02.10',
      features: ['Korlátlan átírás', 'Csapat funkciók', 'API hozzáférés']
    }
  },
  'team-invitation': {
    inviteeName: 'Új Felhasználó',
    inviterName: 'Kovács János',
    teamName: 'Marketing Csapat',
    role: 'tag',
    acceptUrl: 'https://hangjegyzet.hu/teams/accept-invite?token=abc123',
    expiryDate: '2024.01.17',
    message: 'Szeretettel várunk a csapatunkban!',
    isAdmin: false,
    hasAccount: false
  },
  'password-reset': {
    userName: 'Teszt Felhasználó',
    resetUrl: 'https://hangjegyzet.hu/auth/reset-password?token=xyz789',
    expiryHours: 24,
    ipAddress: '192.168.1.1',
    userAgent: 'Chrome 120.0 / Windows 10',
    requestTime: new Date().toLocaleString('hu-HU'),
    supportEmail: 'support@hangjegyzet.hu'
  },
  'email-verification': {
    userName: 'Teszt Felhasználó',
    userEmail: 'teszt@example.com',
    verificationUrl: 'https://hangjegyzet.hu/auth/verify-email?token=ver123',
    verificationCode: 'ABC123'
  }
}

export function EmailPreview() {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateType>('welcome')
  const [variables, setVariables] = useState<Record<string, any>>(defaultVariables.welcome)
  const [preview, setPreview] = useState<{
    subject: string
    htmlContent: string
    textContent: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [isSending, setIsSending] = useState(false)

  const handleTemplateChange = (template: EmailTemplateType) => {
    setSelectedTemplate(template)
    setVariables(defaultVariables[template])
    setPreview(null)
  }

  const handleVariableChange = (key: string, value: any) => {
    setVariables(prev => ({ ...prev, [key]: value }))
  }

  const loadPreview = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/emails/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate,
          variables
        })
      })

      if (!response.ok) {
        throw new Error('Failed to load preview')
      }

      const data = await response.json()
      setPreview(data)
    } catch (error) {
      toast.error('Hiba történt az előnézet betöltése során')
    } finally {
      setIsLoading(false)
    }
  }

  const sendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Kérem adja meg az email címet')
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/admin/emails/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: selectedTemplate,
          variables,
          to: testEmail
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send test email')
      }

      toast.success('Teszt email sikeresen elküldve!')
      setTestEmail('')
    } catch (error) {
      toast.error('Hiba történt a teszt email küldése során')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Email sablon kiválasztása</CardTitle>
          <CardDescription>
            Válassza ki a megtekinteni kívánt email sablont
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Sablon</Label>
              <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Teszt email címe</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="teszt@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
                <Button 
                  onClick={sendTestEmail}
                  disabled={isSending || !preview}
                >
                  {isSending ? (
                    <>
                      <Send className="h-4 w-4 mr-2 animate-spin" />
                      Küldés...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Teszt
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Sablon változók</CardTitle>
          <CardDescription>
            Állítsa be a sablon változóit az előnézethez
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(variables).map(([key, value]) => (
              <div key={key}>
                <Label>{key}</Label>
                {typeof value === 'string' && value.length < 100 ? (
                  <Input
                    value={value}
                    onChange={(e) => handleVariableChange(key, e.target.value)}
                  />
                ) : (
                  <Textarea
                    value={JSON.stringify(value, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        handleVariableChange(key, parsed)
                      } catch {
                        // Invalid JSON, keep as string
                        handleVariableChange(key, e.target.value)
                      }
                    }}
                    rows={4}
                  />
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-4">
            <Button onClick={loadPreview} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Eye className="h-4 w-4 mr-2 animate-spin" />
                  Betöltés...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Előnézet betöltése
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {preview && (
        <Card>
          <CardHeader>
            <CardTitle>Email előnézet</CardTitle>
            <CardDescription>
              Tárgy: {preview.subject}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="html" className="space-y-4">
              <TabsList>
                <TabsTrigger value="html">
                  <Eye className="h-4 w-4 mr-2" />
                  HTML nézet
                </TabsTrigger>
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-2" />
                  Szöveges nézet
                </TabsTrigger>
                <TabsTrigger value="source">
                  <Code className="h-4 w-4 mr-2" />
                  Forráskód
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="html">
                <div className="border rounded-lg bg-white">
                  <iframe
                    srcDoc={preview.htmlContent}
                    className="w-full h-[600px]"
                    title="Email HTML preview"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="text">
                <div className="border rounded-lg p-4 bg-gray-50">
                  <pre className="whitespace-pre-wrap text-sm">
                    {preview.textContent}
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="source">
                <div className="border rounded-lg p-4 bg-gray-900 text-gray-100 overflow-x-auto">
                  <pre className="text-xs">
                    <code>{preview.htmlContent}</code>
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}