'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Share2, 
  Copy, 
  Trash2, 
  Lock, 
  Clock,
  Eye,
  Link,
  CheckCheck
} from 'lucide-react'
import { toast } from 'sonner'

interface ShareInfo {
  id: string
  share_token: string
  url: string
  password_hash?: string
  expires_at?: string
  view_count: number
  max_views?: number
  created_at: string
  isActive: boolean
  settings: {
    showTranscript?: boolean
    showHighlights?: boolean
    showActionItems?: boolean
  }
}

interface ShareManagerProps {
  meetingId: string
}

export function ShareManager({ meetingId }: ShareManagerProps) {
  const [shares, setShares] = useState<ShareInfo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // New share form state
  const [password, setPassword] = useState('')
  const [expiresIn, setExpiresIn] = useState('')
  const [maxViews, setMaxViews] = useState('')
  const [showTranscript, setShowTranscript] = useState(true)
  const [showHighlights, setShowHighlights] = useState(true)
  const [showActionItems, setShowActionItems] = useState(true)

  const loadShares = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/meetings/${meetingId}/share`)
      if (response.ok) {
        const data = await response.json()
        setShares(data)
      }
    } catch (error) {
      console.error('Failed to load shares:', error)
      toast.error('Nem sikerült betölteni a megosztásokat')
    } finally {
      setIsLoading(false)
    }
  }, [meetingId])

  useEffect(() => {
    loadShares()
  }, [loadShares])

  const createShare = async () => {
    setIsCreating(true)
    try {
      const body: any = {
        showTranscript,
        showHighlights,
        showActionItems
      }
      
      if (password) body.password = password
      if (expiresIn) body.expiresIn = parseInt(expiresIn)
      if (maxViews) body.maxViews = parseInt(maxViews)
      
      const response = await fetch(`/api/meetings/${meetingId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (response.ok) {
        const newShare = await response.json()
        setShares([newShare, ...shares])
        toast.success('Megosztási link létrehozva')
        setShowDialog(false)
        resetForm()
        
        // Auto-copy the new link
        await copyToClipboard(newShare.url, newShare.id)
      } else {
        throw new Error('Failed to create share')
      }
    } catch (error) {
      console.error('Failed to create share:', error)
      toast.error('Nem sikerült létrehozni a megosztást')
    } finally {
      setIsCreating(false)
    }
  }

  const deleteShare = async (shareToken: string) => {
    try {
      const response = await fetch(`/api/meetings/${meetingId}/share?token=${shareToken}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setShares(shares.filter(s => s.share_token !== shareToken))
        toast.success('Megosztás törölve')
      } else {
        throw new Error('Failed to delete share')
      }
    } catch (error) {
      console.error('Failed to delete share:', error)
      toast.error('Nem sikerült törölni a megosztást')
    }
  }

  const copyToClipboard = async (url: string, shareId: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(shareId)
      toast.success('Link másolva a vágólapra')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error('Nem sikerült másolni a linket')
    }
  }

  const resetForm = () => {
    setPassword('')
    setExpiresIn('')
    setMaxViews('')
    setShowTranscript(true)
    setShowHighlights(true)
    setShowActionItems(true)
  }

  const formatExpiresAt = (expiresAt: string) => {
    const date = new Date(expiresAt)
    const now = new Date()
    const diff = date.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) {
      return `${days} nap múlva lejár`
    } else if (hours > 0) {
      return `${hours} óra múlva lejár`
    } else {
      return 'Hamarosan lejár'
    }
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Nyilvános megosztások</h3>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              Új megosztás
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nyilvános link létrehozása</DialogTitle>
              <DialogDescription>
                Hozzon létre egy linket, amellyel bárki megtekintheti ezt a meetinget bejelentkezés nélkül.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="password">Jelszó (opcionális)</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Jelszó védelem hozzáadása"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="expires">Lejárat (órákban)</Label>
                <Input
                  id="expires"
                  type="number"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  placeholder="pl. 24, 48, 168"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="maxViews">Maximum megtekintések</Label>
                <Input
                  id="maxViews"
                  type="number"
                  value={maxViews}
                  onChange={(e) => setMaxViews(e.target.value)}
                  placeholder="pl. 10, 50, 100"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Mit osszon meg?</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showTranscript}
                      onChange={(e) => setShowTranscript(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Átirat</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showHighlights}
                      onChange={(e) => setShowHighlights(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Összefoglaló és highlights</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={showActionItems}
                      onChange={(e) => setShowActionItems(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Teendők</span>
                  </label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Mégse
              </Button>
              <Button
                type="button"
                onClick={createShare}
                disabled={isCreating}
              >
                {isCreating ? 'Létrehozás...' : 'Link létrehozása'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {shares.length === 0 ? (
        <Card className="p-6 text-center">
          <Link className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Még nincs nyilvános megosztás ehhez a meetinghez.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {shares.map((share) => (
            <Card key={share.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {share.password_hash && (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="w-3 h-3" />
                        Jelszóval védett
                      </Badge>
                    )}
                    {share.expires_at && (
                      <Badge 
                        variant={share.isActive ? 'outline' : 'destructive'} 
                        className="gap-1"
                      >
                        <Clock className="w-3 h-3" />
                        {share.isActive ? formatExpiresAt(share.expires_at) : 'Lejárt'}
                      </Badge>
                    )}
                    {share.max_views && (
                      <Badge variant="outline" className="gap-1">
                        <Eye className="w-3 h-3" />
                        {share.view_count}/{share.max_views}
                      </Badge>
                    )}
                    {!share.isActive && (
                      <Badge variant="destructive">Inaktív</Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {share.url}
                    </code>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Létrehozva: {new Date(share.created_at).toLocaleString('hu-HU')}
                    {share.view_count > 0 && ` • ${share.view_count} megtekintés`}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(share.url, share.id)}
                  >
                    {copiedId === share.id ? (
                      <CheckCheck className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteShare(share.share_token)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}