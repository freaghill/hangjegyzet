'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { 
  Search, 
  Loader2, 
  Building2, 
  Users, 
  FolderOpen, 
  Link, 
  Unlink,
  CheckCircle,
  AlertCircle,
  Mail,
  Phone,
  RefreshCw,
  Sparkles
} from 'lucide-react'

interface CRMEntity {
  id: number
  type: 'contact' | 'company' | 'project'
  name: string
  email?: string
  phone?: string
  additional_data?: any
}

interface MeetingLink {
  synced: boolean
  status: string
  lastSyncedAt?: string
  activityId?: number
  projectId?: number
  contactIds?: number[]
  companyIds?: number[]
  entities?: CRMEntity[]
  error?: string
}

interface DetectedEntity {
  type: string
  value: string
  matched?: {
    type: string
    id: number
    name: string
  }
}

export function CRMLinker({ meetingId }: { meetingId: string }) {
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [hasIntegration, setHasIntegration] = useState(false)
  const [meetingLink, setMeetingLink] = useState<MeetingLink | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{
    contacts: CRMEntity[]
    companies: CRMEntity[]
    projects: CRMEntity[]
  }>({ contacts: [], companies: [], projects: [] })
  const [selectedEntities, setSelectedEntities] = useState<{
    projectId?: number
    contactIds: number[]
    companyIds: number[]
  }>({ contactIds: [], companyIds: [] })
  const [detectedEntities, setDetectedEntities] = useState<DetectedEntity[]>([])

  useEffect(() => {
    checkIntegration()
    loadMeetingLink()
  }, [meetingId])

  const checkIntegration = async () => {
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

      const { data: integration } = await supabase
        .from('minicrm_integrations')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .single()

      setHasIntegration(!!integration)
    } catch (error) {
      console.error('Error checking integration:', error)
    }
  }

  const loadMeetingLink = async () => {
    try {
      const response = await fetch(`/api/integrations/minicrm/sync?meetingId=${meetingId}`)
      if (response.ok) {
        const data = await response.json()
        setMeetingLink(data)
        
        if (data.synced) {
          setSelectedEntities({
            projectId: data.projectId,
            contactIds: data.contactIds || [],
            companyIds: data.companyIds || [],
          })
        }
      }
    } catch (error) {
      console.error('Error loading meeting link:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch(
        `/api/integrations/minicrm/search?q=${encodeURIComponent(searchQuery)}`
      )

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      setSearchResults(data)
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Failed to search CRM')
    } finally {
      setSearching(false)
    }
  }

  const detectEntities = async () => {
    setDetecting(true)
    try {
      const response = await fetch('/api/integrations/minicrm/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      })

      if (!response.ok) {
        throw new Error('Detection failed')
      }

      const data = await response.json()
      setDetectedEntities(data.detected || [])
      
      // Auto-select matched entities
      const matchedContactIds = data.matched
        .filter((e: any) => e.matched.type === 'contact')
        .map((e: any) => e.matched.id)
      
      const matchedCompanyIds = data.matched
        .filter((e: any) => e.matched.type === 'company')
        .map((e: any) => e.matched.id)
      
      setSelectedEntities(prev => ({
        ...prev,
        contactIds: [...new Set([...prev.contactIds, ...matchedContactIds])],
        companyIds: [...new Set([...prev.companyIds, ...matchedCompanyIds])],
      }))

      toast.success(`Detected ${data.detected.length} entities, matched ${data.matched.length}`)
    } catch (error) {
      console.error('Detection error:', error)
      toast.error('Failed to detect entities')
    } finally {
      setDetecting(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/integrations/minicrm/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          projectId: selectedEntities.projectId,
          contactIds: selectedEntities.contactIds,
          companyIds: selectedEntities.companyIds,
        }),
      })

      if (!response.ok) {
        throw new Error('Sync failed')
      }

      toast.success('Successfully synced to MiniCRM')
      await loadMeetingLink()
    } catch (error) {
      console.error('Sync error:', error)
      toast.error('Failed to sync to MiniCRM')
    } finally {
      setSyncing(false)
    }
  }

  const handleUnlink = async () => {
    try {
      const response = await fetch('/api/integrations/minicrm/sync', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId }),
      })

      if (!response.ok) {
        throw new Error('Unlink failed')
      }

      toast.success('Successfully unlinked from MiniCRM')
      setMeetingLink(null)
      setSelectedEntities({ contactIds: [], companyIds: [] })
    } catch (error) {
      console.error('Unlink error:', error)
      toast.error('Failed to unlink from MiniCRM')
    }
  }

  const toggleEntity = (entity: CRMEntity) => {
    if (entity.type === 'project') {
      setSelectedEntities(prev => ({
        ...prev,
        projectId: prev.projectId === entity.id ? undefined : entity.id,
      }))
    } else if (entity.type === 'contact') {
      setSelectedEntities(prev => ({
        ...prev,
        contactIds: prev.contactIds.includes(entity.id)
          ? prev.contactIds.filter(id => id !== entity.id)
          : [...prev.contactIds, entity.id],
      }))
    } else if (entity.type === 'company') {
      setSelectedEntities(prev => ({
        ...prev,
        companyIds: prev.companyIds.includes(entity.id)
          ? prev.companyIds.filter(id => id !== entity.id)
          : [...prev.companyIds, entity.id],
      }))
    }
  }

  if (!hasIntegration) {
    return null
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
            <CardTitle>MiniCRM Link</CardTitle>
          </div>
          {meetingLink?.synced && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Synced
            </Badge>
          )}
        </div>
        <CardDescription>
          Link this meeting to your CRM contacts, companies, and projects
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {meetingLink?.error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {meetingLink.error}
            </div>
          </div>
        )}

        {meetingLink?.synced ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              {meetingLink.activityId && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Activity ID:</span>{' '}
                  <span className="font-medium">#{meetingLink.activityId}</span>
                </div>
              )}
              
              {meetingLink.lastSyncedAt && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Last synced:</span>{' '}
                  <span className="font-medium">
                    {new Date(meetingLink.lastSyncedAt).toLocaleString('hu-HU')}
                  </span>
                </div>
              )}

              {meetingLink.entities && meetingLink.entities.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Linked entities:</div>
                  <div className="flex flex-wrap gap-2">
                    {meetingLink.entities.map((entity) => (
                      <Badge key={`${entity.type}-${entity.id}`} variant="outline">
                        {entity.type === 'contact' && <Users className="h-3 w-3 mr-1" />}
                        {entity.type === 'company' && <Building2 className="h-3 w-3 mr-1" />}
                        {entity.type === 'project' && <FolderOpen className="h-3 w-3 mr-1" />}
                        {entity.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSync}
                disabled={syncing}
                className="flex-1"
              >
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-sync
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleUnlink}
              >
                <Unlink className="mr-2 h-4 w-4" />
                Unlink
              </Button>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="search" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">Manual Search</TabsTrigger>
              <TabsTrigger value="detect">Auto-detect</TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search contacts, companies, or projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                >
                  {searching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {(searchResults.contacts.length > 0 ||
                searchResults.companies.length > 0 ||
                searchResults.projects.length > 0) && (
                <ScrollArea className="h-[300px] rounded-lg border p-4">
                  <div className="space-y-4">
                    {searchResults.projects.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Projects</Label>
                        <div className="mt-2 space-y-2">
                          {searchResults.projects.map((project) => (
                            <div
                              key={project.id}
                              className={`flex items-center justify-between rounded-lg border p-2 cursor-pointer transition-colors ${
                                selectedEntities.projectId === project.id
                                  ? 'border-primary bg-primary/10'
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => toggleEntity(project)}
                            >
                              <div className="flex items-center gap-2">
                                <FolderOpen className="h-4 w-4" />
                                <span className="text-sm">{project.name}</span>
                              </div>
                              {selectedEntities.projectId === project.id && (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.contacts.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Contacts</Label>
                        <div className="mt-2 space-y-2">
                          {searchResults.contacts.map((contact) => (
                            <div
                              key={contact.id}
                              className={`flex items-center justify-between rounded-lg border p-2 cursor-pointer transition-colors ${
                                selectedEntities.contactIds.includes(contact.id)
                                  ? 'border-primary bg-primary/10'
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => toggleEntity(contact)}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  <span className="text-sm font-medium">{contact.name}</span>
                                </div>
                                <div className="flex gap-3 text-xs text-muted-foreground">
                                  {contact.email && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="h-3 w-3" />
                                      {contact.email}
                                    </div>
                                  )}
                                  {contact.phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="h-3 w-3" />
                                      {contact.phone}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {selectedEntities.contactIds.includes(contact.id) && (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {searchResults.companies.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Companies</Label>
                        <div className="mt-2 space-y-2">
                          {searchResults.companies.map((company) => (
                            <div
                              key={company.id}
                              className={`flex items-center justify-between rounded-lg border p-2 cursor-pointer transition-colors ${
                                selectedEntities.companyIds.includes(company.id)
                                  ? 'border-primary bg-primary/10'
                                  : 'hover:bg-muted/50'
                              }`}
                              onClick={() => toggleEntity(company)}
                            >
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                <span className="text-sm">{company.name}</span>
                              </div>
                              {selectedEntities.companyIds.includes(company.id) && (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="detect" className="space-y-4">
              <Button
                onClick={detectEntities}
                disabled={detecting}
                className="w-full"
              >
                {detecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Detecting entities...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Auto-detect entities in transcript
                  </>
                )}
              </Button>

              {detectedEntities.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Detected Entities</Label>
                  <ScrollArea className="h-[200px] rounded-lg border p-4">
                    <div className="space-y-2">
                      {detectedEntities.map((entity, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border p-2"
                        >
                          <div className="flex items-center gap-2">
                            {entity.type === 'email' && <Mail className="h-4 w-4" />}
                            {entity.type === 'phone' && <Phone className="h-4 w-4" />}
                            {entity.type === 'company' && <Building2 className="h-4 w-4" />}
                            {entity.type === 'person' && <Users className="h-4 w-4" />}
                            <span className="text-sm">{entity.value}</span>
                          </div>
                          {entity.matched && (
                            <Badge variant="secondary" className="text-xs">
                              Matched: {entity.matched.name}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!meetingLink?.synced && (
          selectedEntities.projectId ||
          selectedEntities.contactIds.length > 0 ||
          selectedEntities.companyIds.length > 0
        ) && (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Selected entities</Label>
              <div className="flex flex-wrap gap-2">
                {selectedEntities.projectId && (
                  <Badge variant="secondary">
                    <FolderOpen className="h-3 w-3 mr-1" />
                    Project #{selectedEntities.projectId}
                  </Badge>
                )}
                {selectedEntities.contactIds.map(id => (
                  <Badge key={`contact-${id}`} variant="secondary">
                    <Users className="h-3 w-3 mr-1" />
                    Contact #{id}
                  </Badge>
                ))}
                {selectedEntities.companyIds.map(id => (
                  <Badge key={`company-${id}`} variant="secondary">
                    <Building2 className="h-3 w-3 mr-1" />
                    Company #{id}
                  </Badge>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSync}
              disabled={syncing}
              className="w-full"
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing to MiniCRM...
                </>
              ) : (
                <>
                  <Link className="mr-2 h-4 w-4" />
                  Sync to MiniCRM
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}