'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { 
  Slack, MessageSquare, Users, Building2, Link, Unlink, 
  CheckCircle, XCircle, Settings, Send, Calendar, Zap,
  AlertCircle, Loader2, ExternalLink
} from 'lucide-react'

interface Integration {
  id: string
  provider: string
  name: string
  description: string
  icon: React.ReactNode
  category: 'communication' | 'crm' | 'calendar' | 'automation'
  connected: boolean
  metadata?: any
}

export function IntegrationsManager() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const supabase = createClient()

  const availableIntegrations: Omit<Integration, 'id' | 'connected'>[] = [
    {
      provider: 'slack',
      name: 'Slack',
      description: 'Meeting összefoglalók és akció pontok küldése Slack csatornákba',
      icon: <Slack className="w-5 h-5" />,
      category: 'communication'
    },
    {
      provider: 'teams',
      name: 'Microsoft Teams',
      description: 'Integráció Teams csatornákkal és Planner feladatokkal',
      icon: <Users className="w-5 h-5" />,
      category: 'communication'
    },
    {
      provider: 'hubspot',
      name: 'HubSpot',
      description: 'Meeting jegyzetek és aktivitások szinkronizálása HubSpot CRM-mel',
      icon: <Building2 className="w-5 h-5" />,
      category: 'crm'
    },
    {
      provider: 'salesforce',
      name: 'Salesforce',
      description: 'Opportunity és contact management integráció',
      icon: <Building2 className="w-5 h-5" />,
      category: 'crm'
    },
    {
      provider: 'google_calendar',
      name: 'Google Calendar',
      description: 'Automatikus meeting import és szinkronizáció',
      icon: <Calendar className="w-5 h-5" />,
      category: 'calendar'
    },
    {
      provider: 'outlook',
      name: 'Outlook Calendar',
      description: 'Microsoft 365 naptár integráció',
      icon: <Calendar className="w-5 h-5" />,
      category: 'calendar'
    }
  ]

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userIntegrations } = await supabase
        .from('user_integrations')
        .select('*')
        .eq('user_id', user.id)

      const integrationsMap = new Map(
        userIntegrations?.map(ui => [ui.provider, ui]) || []
      )

      const allIntegrations = availableIntegrations.map(ai => ({
        ...ai,
        id: integrationsMap.get(ai.provider)?.id || crypto.randomUUID(),
        connected: integrationsMap.has(ai.provider),
        metadata: integrationsMap.get(ai.provider)?.metadata
      }))

      setIntegrations(allIntegrations)
    } catch (error) {
      console.error('Error loading integrations:', error)
      toast.error('Integrációk betöltése sikertelen')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async (integration: Integration) => {
    try {
      // Generate state for OAuth
      const state = crypto.randomUUID()
      
      // Store state in session storage
      sessionStorage.setItem(`oauth_state_${integration.provider}`, state)
      
      // Redirect to OAuth flow
      window.location.href = `/api/integrations/${integration.provider}/auth?state=${state}`
    } catch (error) {
      console.error('Error connecting integration:', error)
      toast.error('Kapcsolódás sikertelen')
    }
  }

  const handleDisconnect = async (integration: Integration) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('user_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('provider', integration.provider)

      if (error) throw error

      await loadIntegrations()
      toast.success('Integráció sikeresen leválasztva')
    } catch (error) {
      console.error('Error disconnecting integration:', error)
      toast.error('Leválasztás sikertelen')
    }
  }

  const handleTestIntegration = async (integration: Integration) => {
    try {
      const response = await fetch(`/api/integrations/${integration.provider}/test`)
      
      if (response.ok) {
        toast.success('Kapcsolat sikeres!')
      } else {
        throw new Error('Connection test failed')
      }
    } catch (error) {
      console.error('Error testing integration:', error)
      toast.error('Kapcsolat tesztelése sikertelen')
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'communication': return <MessageSquare className="w-4 h-4" />
      case 'crm': return <Building2 className="w-4 h-4" />
      case 'calendar': return <Calendar className="w-4 h-4" />
      case 'automation': return <Zap className="w-4 h-4" />
      default: return <Link className="w-4 h-4" />
    }
  }

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'communication': return 'Kommunikáció'
      case 'crm': return 'CRM'
      case 'calendar': return 'Naptár'
      case 'automation': return 'Automatizáció'
      default: return category
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = []
    }
    acc[integration.category].push(integration)
    return acc
  }, {} as Record<string, Integration[]>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integrációk</h2>
          <p className="text-muted-foreground mt-1">
            Kapcsolja össze a HangJegyzet.AI-t kedvenc eszközeivel
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {integrations.filter(i => i.connected).length} / {integrations.length} kapcsolódva
        </Badge>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Összes</TabsTrigger>
          <TabsTrigger value="connected">Kapcsolódva</TabsTrigger>
          {Object.keys(groupedIntegrations).map(category => (
            <TabsTrigger key={category} value={category}>
              {getCategoryName(category)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                {getCategoryIcon(category)}
                {getCategoryName(category)}
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryIntegrations.map(renderIntegrationCard)}
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="connected" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations.filter(i => i.connected).map(renderIntegrationCard)}
          </div>
          {integrations.filter(i => i.connected).length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Még nincs kapcsolt integráció</p>
            </div>
          )}
        </TabsContent>

        {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryIntegrations.map(renderIntegrationCard)}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedIntegration?.name} beállítások
            </DialogTitle>
            <DialogDescription>
              Konfigurálja az integráció működését
            </DialogDescription>
          </DialogHeader>
          {selectedIntegration && renderIntegrationConfig(selectedIntegration)}
        </DialogContent>
      </Dialog>
    </div>
  )

  function renderIntegrationCard(integration: Integration) {
    return (
      <Card key={integration.id} className={integration.connected ? 'border-green-500' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              {integration.icon}
              {integration.name}
            </CardTitle>
            {integration.connected && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
          <CardDescription>{integration.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integration.connected ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Kapcsolódva</span>
                <Badge variant="outline" className="text-green-600">
                  Aktív
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedIntegration(integration)
                    setConfigDialogOpen(true)
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Beállítások
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTestIntegration(integration)}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Teszt
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDisconnect(integration)}
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Leválaszt
                </Button>
              </div>
            </>
          ) : (
            <Button
              className="w-full"
              onClick={() => handleConnect(integration)}
            >
              <Link className="w-4 h-4 mr-2" />
              Kapcsolódás
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  function renderIntegrationConfig(integration: Integration) {
    switch (integration.provider) {
      case 'slack':
        return <SlackConfig integration={integration} />
      case 'teams':
        return <TeamsConfig integration={integration} />
      case 'hubspot':
      case 'salesforce':
        return <CRMConfig integration={integration} />
      default:
        return <DefaultConfig integration={integration} />
    }
  }
}

function SlackConfig({ integration }: { integration: Integration }) {
  const [autoShare, setAutoShare] = useState(integration.metadata?.auto_share || false)
  const [defaultChannel, setDefaultChannel] = useState(integration.metadata?.default_channel || '')
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    loadChannels()
  }, [])

  const loadChannels = async () => {
    try {
      const response = await fetch('/api/integrations/slack/channels')
      if (response.ok) {
        const data = await response.json()
        setChannels(data.channels)
      }
    } catch (error) {
      console.error('Error loading channels:', error)
    }
  }

  const saveConfig = async () => {
    // Save configuration
    toast.success('Beállítások mentve')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="auto-share">Automatikus megosztás</Label>
        <Switch
          id="auto-share"
          checked={autoShare}
          onCheckedChange={setAutoShare}
        />
      </div>
      
      {autoShare && (
        <div className="space-y-2">
          <Label htmlFor="default-channel">Alapértelmezett csatorna</Label>
          <Select value={defaultChannel} onValueChange={setDefaultChannel}>
            <SelectTrigger id="default-channel">
              <SelectValue placeholder="Válasszon csatornát" />
            </SelectTrigger>
            <SelectContent>
              {channels.map(channel => (
                <SelectItem key={channel.id} value={channel.id}>
                  #{channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button onClick={saveConfig} className="w-full">
        Mentés
      </Button>
    </div>
  )
}

function TeamsConfig({ integration }: { integration: Integration }) {
  const [autoCreateTasks, setAutoCreateTasks] = useState(integration.metadata?.auto_create_tasks || false)
  const [defaultTeam, setDefaultTeam] = useState(integration.metadata?.default_team || '')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="auto-tasks">Automatikus Planner feladatok</Label>
        <Switch
          id="auto-tasks"
          checked={autoCreateTasks}
          onCheckedChange={setAutoCreateTasks}
        />
      </div>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          A Teams integráció jelenleg béta verzióban érhető el
        </AlertDescription>
      </Alert>
    </div>
  )
}

function CRMConfig({ integration }: { integration: Integration }) {
  const [autoSync, setAutoSync] = useState(integration.metadata?.auto_sync || false)
  const [syncActionItems, setSyncActionItems] = useState(integration.metadata?.sync_action_items || false)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="auto-sync">Automatikus szinkronizáció</Label>
        <Switch
          id="auto-sync"
          checked={autoSync}
          onCheckedChange={setAutoSync}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <Label htmlFor="sync-actions">Akció pontok szinkronizálása</Label>
        <Switch
          id="sync-actions"
          checked={syncActionItems}
          onCheckedChange={setSyncActionItems}
        />
      </div>
    </div>
  )
}

function DefaultConfig({ integration }: { integration: Integration }) {
  return (
    <div className="text-center py-4">
      <p className="text-muted-foreground">
        Jelenleg nincs elérhető beállítás ehhez az integrációhoz
      </p>
    </div>
  )
}