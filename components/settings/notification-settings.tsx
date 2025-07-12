'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Plus, Trash2, TestTube, Slack, Users, AlertCircle, CheckCircle2, Loader2, Settings } from 'lucide-react'

interface Webhook {
  id: string
  name: string
  type: 'slack' | 'teams'
  webhook_url: string
  channel?: string
  is_active: boolean
  settings: Record<string, any>
  created_at: string
}

interface NotificationPreference {
  id?: string
  webhook_id: string
  event_type: string
  enabled: boolean
  filters: {
    min_duration?: number
    keywords?: string[]
    users?: string[]
  }
}

const EVENT_TYPES = [
  { value: 'meeting_completed', label: 'Megbeszélés feldolgozva', description: 'Értesítés, amikor egy megbeszélés feldolgozása befejeződött' },
  { value: 'meeting_failed', label: 'Feldolgozás sikertelen', description: 'Értesítés, ha egy megbeszélés feldolgozása meghiúsult' },
  { value: 'action_items_created', label: 'Teendők létrehozva', description: 'Értesítés új teendők hozzáadásakor' },
  { value: 'user_mentioned', label: 'Említés', description: 'Értesítés, amikor valaki megemlít téged' },
  { value: 'highlight_created', label: 'Kiemelés hozzáadva', description: 'Értesítés új kiemelések létrehozásakor' },
]

export default function NotificationSettings() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [preferences, setPreferences] = useState<NotificationPreference[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null)
  const [showPreferencesDialog, setShowPreferencesDialog] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    type: 'slack' as 'slack' | 'teams',
    webhook_url: '',
    channel: ''
  })

  const supabase = createClient()

  useEffect(() => {
    loadWebhooks()
  }, [])

  const loadWebhooks = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single()

      if (!profile) return

      const { data: webhookData, error: webhookError } = await supabase
        .from('notification_webhooks')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })

      if (webhookError) throw webhookError

      setWebhooks(webhookData || [])

      // Load preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('organization_id', profile.organization_id)

      if (prefsError) throw prefsError

      setPreferences(prefsData || [])
    } catch (error) {
      console.error('Error loading webhooks:', error)
      toast.error('Nem sikerült betölteni az értesítési beállításokat')
    } finally {
      setLoading(false)
    }
  }

  const handleAddWebhook = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .single()

      if (!profile) {
        toast.error('Nincs szervezet társítva')
        return
      }

      const webhookData = {
        organization_id: profile.organization_id,
        name: formData.name,
        type: formData.type,
        webhook_url: formData.webhook_url,
        channel: formData.channel || null,
        is_active: true,
        settings: {}
      }

      if (editingWebhook) {
        const { error } = await supabase
          .from('notification_webhooks')
          .update(webhookData)
          .eq('id', editingWebhook.id)

        if (error) throw error
        toast.success('Webhook sikeresen frissítve')
      } else {
        const { data, error } = await supabase
          .from('notification_webhooks')
          .insert(webhookData)
          .select()
          .single()

        if (error) throw error

        // Create default preferences for all event types
        const defaultPreferences = EVENT_TYPES.map(eventType => ({
          organization_id: profile.organization_id,
          webhook_id: data.id,
          event_type: eventType.value,
          enabled: true,
          filters: {}
        }))

        await supabase
          .from('notification_preferences')
          .insert(defaultPreferences)

        toast.success('Webhook sikeresen hozzáadva')
      }

      setShowAddDialog(false)
      setEditingWebhook(null)
      setFormData({ name: '', type: 'slack', webhook_url: '', channel: '' })
      loadWebhooks()
    } catch (error) {
      console.error('Error saving webhook:', error)
      toast.error('Nem sikerült menteni a webhook beállításokat')
    }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a webhook-ot?')) return

    try {
      const { error } = await supabase
        .from('notification_webhooks')
        .delete()
        .eq('id', webhookId)

      if (error) throw error

      toast.success('Webhook sikeresen törölve')
      loadWebhooks()
    } catch (error) {
      console.error('Error deleting webhook:', error)
      toast.error('Nem sikerült törölni a webhook-ot')
    }
  }

  const handleToggleWebhook = async (webhookId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('notification_webhooks')
        .update({ is_active: isActive })
        .eq('id', webhookId)

      if (error) throw error

      toast.success(isActive ? 'Webhook aktiválva' : 'Webhook deaktiválva')
      loadWebhooks()
    } catch (error) {
      console.error('Error toggling webhook:', error)
      toast.error('Nem sikerült módosítani a webhook állapotát')
    }
  }

  const handleTestWebhook = async (webhook: Webhook) => {
    setTesting(webhook.id)
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: webhook.type,
          webhookUrl: webhook.webhook_url,
          webhookId: webhook.id
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Teszt értesítés sikeresen elküldve!')
      } else {
        toast.error(result.error || 'Nem sikerült elküldeni a teszt értesítést')
      }
    } catch (error) {
      console.error('Error testing webhook:', error)
      toast.error('Hiba történt a teszt során')
    } finally {
      setTesting(null)
    }
  }

  const handleSavePreferences = async () => {
    try {
      const webhook = selectedWebhook
      if (!webhook) return

      const webhookPrefs = preferences.filter(p => p.webhook_id === webhook.id)

      for (const pref of webhookPrefs) {
        if (pref.id) {
          const { error } = await supabase
            .from('notification_preferences')
            .update({
              enabled: pref.enabled,
              filters: pref.filters
            })
            .eq('id', pref.id)

          if (error) throw error
        }
      }

      toast.success('Beállítások sikeresen mentve')
      setShowPreferencesDialog(false)
      loadWebhooks()
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast.error('Nem sikerült menteni a beállításokat')
    }
  }

  const updatePreference = (webhookId: string, eventType: string, field: string, value: any) => {
    setPreferences(prev => {
      const existing = prev.find(p => p.webhook_id === webhookId && p.event_type === eventType)
      if (existing) {
        return prev.map(p => 
          p.webhook_id === webhookId && p.event_type === eventType
            ? { ...p, [field]: value }
            : p
        )
      } else {
        return [...prev, {
          webhook_id: webhookId,
          event_type: eventType,
          enabled: field === 'enabled' ? value : true,
          filters: field === 'filters' ? value : {}
        }]
      }
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Értesítési Webhookok</CardTitle>
              <CardDescription>
                Állítsd be a Slack és Microsoft Teams értesítéseket
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingWebhook(null)
                setFormData({ name: '', type: 'slack', webhook_url: '', channel: '' })
                setShowAddDialog(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Webhook hozzáadása
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="mx-auto h-12 w-12 mb-4" />
              <p>Még nincs webhook beállítva</p>
              <p className="text-sm mt-2">Adj hozzá egy Slack vagy Teams webhook-ot az értesítések fogadásához</p>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map(webhook => (
                <div key={webhook.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {webhook.type === 'slack' ? (
                        <Slack className="h-5 w-5 mt-0.5 text-[#4A154B]" />
                      ) : (
                        <Users className="h-5 w-5 mt-0.5 text-[#5B5FC7]" />
                      )}
                      <div>
                        <h4 className="font-medium flex items-center gap-2">
                          {webhook.name}
                          {webhook.is_active ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {webhook.type === 'slack' ? 'Slack' : 'Microsoft Teams'} webhook
                          {webhook.channel && ` • Csatorna: ${webhook.channel}`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          {webhook.webhook_url.substring(0, 50)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={webhook.is_active}
                        onCheckedChange={(checked) => handleToggleWebhook(webhook.id, checked)}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedWebhook(webhook)
                          setShowPreferencesDialog(true)
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestWebhook(webhook)}
                        disabled={!webhook.is_active || testing === webhook.id}
                      >
                        {testing === webhook.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TestTube className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingWebhook(webhook)
                          setFormData({
                            name: webhook.name,
                            type: webhook.type,
                            webhook_url: webhook.webhook_url,
                            channel: webhook.channel || ''
                          })
                          setShowAddDialog(true)
                        }}
                      >
                        Szerkesztés
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteWebhook(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Webhook Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingWebhook ? 'Webhook szerkesztése' : 'Új webhook hozzáadása'}
            </DialogTitle>
            <DialogDescription>
              Állítsd be a Slack vagy Teams webhook URL-t az értesítések fogadásához
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Név</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="pl. Marketing csapat"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Típus</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as 'slack' | 'teams' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook_url">Webhook URL</Label>
              <Input
                id="webhook_url"
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder={
                  formData.type === 'slack'
                    ? 'https://hooks.slack.com/services/...'
                    : 'https://outlook.office.com/webhook/...'
                }
              />
              <p className="text-xs text-muted-foreground">
                {formData.type === 'slack' ? (
                  <>
                    Slack webhook létrehozása:{' '}
                    <a
                      href="https://api.slack.com/messaging/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Incoming Webhooks
                    </a>
                  </>
                ) : (
                  <>
                    Teams webhook létrehozása: Csatorna beállítások → Connectors → Incoming Webhook
                  </>
                )}
              </p>
            </div>
            {formData.type === 'slack' && (
              <div className="space-y-2">
                <Label htmlFor="channel">Csatorna (opcionális)</Label>
                <Input
                  id="channel"
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                  placeholder="#general"
                />
                <p className="text-xs text-muted-foreground">
                  Felülírja az alapértelmezett csatornát
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Mégse
            </Button>
            <Button onClick={handleAddWebhook} disabled={!formData.name || !formData.webhook_url}>
              {editingWebhook ? 'Mentés' : 'Hozzáadás'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preferences Dialog */}
      <Dialog open={showPreferencesDialog} onOpenChange={setShowPreferencesDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Értesítési beállítások</DialogTitle>
            <DialogDescription>
              Válaszd ki, mely eseményekről szeretnél értesítést kapni
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
            {selectedWebhook && EVENT_TYPES.map(eventType => {
              const pref = preferences.find(
                p => p.webhook_id === selectedWebhook.id && p.event_type === eventType.value
              )
              return (
                <div key={eventType.value} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                  <Switch
                    checked={pref?.enabled ?? true}
                    onCheckedChange={(checked) => 
                      updatePreference(selectedWebhook.id, eventType.value, 'enabled', checked)
                    }
                  />
                  <div className="flex-1">
                    <Label className="text-base font-medium">{eventType.label}</Label>
                    <p className="text-sm text-muted-foreground">{eventType.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreferencesDialog(false)}>
              Mégse
            </Button>
            <Button onClick={handleSavePreferences}>
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}