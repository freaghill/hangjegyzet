'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Mail, 
  Send, 
  Eye, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react'
import { EmailPreview } from '@/components/admin/email-preview'
import { EmailLogs } from '@/components/admin/email-logs'
import { EmailQueue } from '@/components/admin/email-queue'
import { EmailStats } from '@/components/admin/email-stats'
import { usePermission } from '@/lib/teams/team-context'
import { toast } from 'sonner'

export default function AdminEmailsPage() {
  const [activeTab, setActiveTab] = useState('preview')
  const [isLoading, setIsLoading] = useState(true)
  const hasPermission = usePermission('admin.emails')

  useEffect(() => {
    const checkPermission = async () => {
      setIsLoading(false)
      if (!hasPermission) {
        toast.error('Nincs jogosultsága az email rendszer megtekintéséhez')
      }
    }
    checkPermission()
  }, [hasPermission])

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!hasPermission) {
    return (
      <div className="text-center py-12">
        <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Hozzáférés megtagadva
        </h2>
        <p className="text-gray-600">
          Az email rendszer kezeléséhez adminisztrátori jogosultság szükséges.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Email rendszer</h1>
        <p className="text-gray-600 mt-1">
          Email sablonok, küldési napló és statisztikák kezelése
        </p>
      </div>

      {/* Quick Stats */}
      <EmailStats />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Előnézet
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Napló
          </TabsTrigger>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Várakozó sor
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Sablonok
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview">
          <EmailPreview />
        </TabsContent>

        <TabsContent value="logs">
          <EmailLogs />
        </TabsContent>

        <TabsContent value="queue">
          <EmailQueue />
        </TabsContent>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Email sablonok</CardTitle>
              <CardDescription>
                Elérhető email sablonok és használati statisztikák
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { id: 'welcome', name: 'Üdvözlő email', sent: 1234, opened: 987, clicked: 543 },
                  { id: 'transcription-complete', name: 'Átírás elkészült', sent: 5678, opened: 4321, clicked: 2109 },
                  { id: 'payment-receipt', name: 'Fizetési visszaigazolás', sent: 890, opened: 765, clicked: 432 },
                  { id: 'team-invitation', name: 'Csapat meghívó', sent: 345, opened: 234, clicked: 123 },
                  { id: 'password-reset', name: 'Jelszó visszaállítás', sent: 567, opened: 456, clicked: 345 },
                  { id: 'email-verification', name: 'Email megerősítés', sent: 2345, opened: 1890, clicked: 1567 }
                ].map((template) => (
                  <div key={template.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-gray-500">ID: {template.id}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{template.sent.toLocaleString()}</p>
                        <p className="text-gray-500">Elküldve</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{template.opened.toLocaleString()}</p>
                        <p className="text-gray-500">Megnyitva</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{template.clicked.toLocaleString()}</p>
                        <p className="text-gray-500">Kattintva</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-green-600">
                          {((template.opened / template.sent) * 100).toFixed(1)}%
                        </p>
                        <p className="text-gray-500">Megnyitási arány</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}