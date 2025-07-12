'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Plus, Key, Copy, Trash2, Eye, EyeOff } from 'lucide-react'
import { apiKeyManager, ApiKey } from '@/lib/api/keys'
import { useOrganization } from '@/hooks/useOrganization'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function ApiSettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showNewKey, setShowNewKey] = useState(false)
  const { organization } = useOrganization()
  const supabase = createClient()

  useEffect(() => {
    if (organization) {
      loadApiKeys()
    }
  }, [organization])

  const loadApiKeys = async () => {
    try {
      const keys = await apiKeyManager.listApiKeys(organization!.id)
      setApiKeys(keys)
    } catch (error) {
      console.error('Error loading API keys:', error)
      toast.error('Nem sikerült betölteni az API kulcsokat')
    } finally {
      setIsLoading(false)
    }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Kérjük adjon nevet az API kulcsnak')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !organization) return

      const { key, apiKey } = await apiKeyManager.createApiKey(
        organization.id,
        user.id,
        { name: newKeyName }
      )
      
      setNewKey(key)
      setApiKeys([apiKey, ...apiKeys])
      setShowCreateDialog(false)
      setNewKeyName('')
      toast.success('API kulcs sikeresen létrehozva')
    } catch (error) {
      console.error('Error creating API key:', error)
      toast.error('Nem sikerült létrehozni az API kulcsot')
    }
  }

  const toggleApiKey = async (keyId: string, isActive: boolean) => {
    try {
      await apiKeyManager.updateApiKey(keyId, { isActive })
      setApiKeys(apiKeys.map(key => 
        key.id === keyId ? { ...key, isActive } : key
      ))
      toast.success(isActive ? 'API kulcs aktiválva' : 'API kulcs deaktiválva')
    } catch (error) {
      console.error('Error updating API key:', error)
      toast.error('Nem sikerült frissíteni az API kulcsot')
    }
  }

  const deleteApiKey = async (keyId: string) => {
    if (!confirm('Biztosan törölni szeretné ezt az API kulcsot?')) return

    try {
      await apiKeyManager.deleteApiKey(keyId)
      setApiKeys(apiKeys.filter(key => key.id !== keyId))
      toast.success('API kulcs törölve')
    } catch (error) {
      console.error('Error deleting API key:', error)
      toast.error('Nem sikerült törölni az API kulcsot')
    }
  }

  const copyKey = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Vágólapra másolva')
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">API Beállítások</h1>
          <p className="text-gray-600 mt-1">
            Kezelje API kulcsait és integrációit
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Új API kulcs
        </Button>
      </div>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Dokumentáció</CardTitle>
          <CardDescription>
            REST API endpoint és autentikáció
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Base URL</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input 
                readOnly 
                value="https://hangjegyzet.hu/api/v1" 
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyKey('https://hangjegyzet.hu/api/v1')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Autentikáció</Label>
            <p className="text-sm text-gray-600 mt-1">
              Használja az Authorization header-t: <code className="bg-gray-100 px-2 py-1 rounded">Bearer YOUR_API_KEY</code>
            </p>
          </div>
          <div>
            <Label>Példa kérés</Label>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm mt-1 overflow-x-auto">
{`curl -X GET https://hangjegyzet.hu/api/v1/meetings \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Kulcsok</CardTitle>
          <CardDescription>
            Aktív API kulcsok és hozzáférések
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Még nincs API kulcsa</p>
              <p className="text-sm text-gray-500 mt-1">
                Hozzon létre egyet az integrációk használatához
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{key.name}</h3>
                      <Badge variant={key.isActive ? 'default' : 'secondary'}>
                        {key.isActive ? 'Aktív' : 'Inaktív'}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Kulcs: {key.keyPreview} • 
                      Létrehozva: {new Date(key.createdAt).toLocaleDateString('hu-HU')}
                      {key.lastUsedAt && ` • Utoljára használva: ${new Date(key.lastUsedAt).toLocaleDateString('hu-HU')}`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Rate limit: {key.rateLimit} kérés/óra
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={key.isActive}
                      onCheckedChange={(checked) => toggleApiKey(key.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteApiKey(key.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új API kulcs létrehozása</DialogTitle>
            <DialogDescription>
              Az API kulcsot csak egyszer mutatjuk meg. Mentse el biztonságos helyre!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Név</Label>
              <Input
                id="name"
                placeholder="pl. Mobil alkalmazás"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Mégse
            </Button>
            <Button onClick={createApiKey}>
              Létrehozás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show New Key Dialog */}
      {newKey && (
        <Dialog open={!!newKey} onOpenChange={() => setNewKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API kulcs létrehozva</DialogTitle>
              <DialogDescription>
                Mentse el ezt a kulcsot - nem fogjuk újra megjeleníteni!
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Az Ön API kulcsa</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    readOnly
                    type={showNewKey ? 'text' : 'password'}
                    value={newKey}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowNewKey(!showNewKey)}
                  >
                    {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyKey(newKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setNewKey(null)}>
                Bezárás
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}