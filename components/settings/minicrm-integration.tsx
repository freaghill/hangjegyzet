'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ExternalLink, Loader2, CheckCircle, XCircle, Building2, Users, FolderOpen } from 'lucide-react'

interface MiniCRMIntegration {
  id: string
  system_id: string
  api_url: string
  is_active: boolean
  auto_sync_enabled: boolean
  sync_direction: 'to_crm' | 'from_crm' | 'both'
  last_sync_at: string | null
  default_project_id: number | null
  activity_type_id: number | null
}

export default function MiniCRMIntegration() {
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [integration, setIntegration] = useState<MiniCRMIntegration | null>(null)
  const [systemId, setSystemId] = useState('')
  const [settings, setSettings] = useState({
    autoSyncEnabled: true,
    syncDirection: 'both' as const,
  })

  useEffect(() => {
    loadIntegration()
  }, [])

  const loadIntegration = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const { data } = await supabase
        .from('minicrm_integrations')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .single()

      if (data) {
        setIntegration(data)
        setSettings({
          autoSyncEnabled: data.auto_sync_enabled,
          syncDirection: data.sync_direction,
        })
      }
    } catch (error) {
      console.error('Error loading MiniCRM integration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!systemId.trim()) {
      toast.error('Please enter your MiniCRM system ID')
      return
    }

    setConnecting(true)
    try {
      const response = await fetch('/api/integrations/minicrm/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemId: systemId.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start connection')
      }

      // Redirect to auth URL
      window.location.href = data.authUrl
    } catch (error) {
      console.error('Connection error:', error)
      toast.error('Failed to connect to MiniCRM')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      const response = await fetch('/api/integrations/minicrm/auth', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setIntegration(null)
      setSystemId('')
      toast.success('Successfully disconnected from MiniCRM')
    } catch (error) {
      console.error('Disconnect error:', error)
      toast.error('Failed to disconnect from MiniCRM')
    } finally {
      setDisconnecting(false)
    }
  }

  const updateSettings = async (updates: Partial<typeof settings>) => {
    const newSettings = { ...settings, ...updates }
    setSettings(newSettings)

    if (!integration) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('minicrm_integrations')
        .update({
          auto_sync_enabled: newSettings.autoSyncEnabled,
          sync_direction: newSettings.syncDirection,
        })
        .eq('id', integration.id)

      if (error) throw error

      toast.success('Settings updated')
    } catch (error) {
      console.error('Failed to update settings:', error)
      toast.error('Failed to update settings')
      // Revert on error
      setSettings(settings)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5" />
            <CardTitle>MiniCRM Integration</CardTitle>
          </div>
          {integration && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          )}
        </div>
        <CardDescription>
          Connect your MiniCRM account to sync meeting data with your CRM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!integration ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="system-id">MiniCRM System ID</Label>
              <Input
                id="system-id"
                placeholder="your-system"
                value={systemId}
                onChange={(e) => setSystemId(e.target.value)}
                disabled={connecting}
              />
              <p className="text-xs text-muted-foreground">
                Enter the subdomain from your MiniCRM URL (e.g., "your-system" from your-system.minicrm.hu)
              </p>
            </div>

            <Button
              onClick={handleConnect}
              disabled={connecting || !systemId.trim()}
              className="w-full"
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Connect to MiniCRM
                </>
              )}
            </Button>

            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="font-medium mb-2">What you can do with MiniCRM integration:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <Users className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  Automatically link meetings to CRM contacts and companies
                </li>
                <li className="flex items-start">
                  <FolderOpen className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  Create activities from meetings in your CRM projects
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  Sync meeting summaries and action items to CRM
                </li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Connected to {integration.system_id}</div>
                  <div className="text-xs text-muted-foreground">
                    {integration.api_url}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(integration.api_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>

              {integration.last_sync_at && (
                <div className="text-sm text-muted-foreground">
                  Last synced: {new Date(integration.last_sync_at).toLocaleString('hu-HU')}
                </div>
              )}

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatic Sync</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically sync meetings to CRM when completed
                    </p>
                  </div>
                  <Switch
                    checked={settings.autoSyncEnabled}
                    onCheckedChange={(checked) =>
                      updateSettings({ autoSyncEnabled: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Sync Direction</Label>
                  <Select
                    value={settings.syncDirection}
                    onValueChange={(value: 'to_crm' | 'from_crm' | 'both') =>
                      updateSettings({ syncDirection: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="to_crm">
                        To CRM only (upload meeting data)
                      </SelectItem>
                      <SelectItem value="from_crm">
                        From CRM only (import CRM data)
                      </SelectItem>
                      <SelectItem value="both">
                        Two-way sync
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                >
                  {disconnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Disconnect
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}