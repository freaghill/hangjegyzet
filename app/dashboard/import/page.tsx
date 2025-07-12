import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UniversalImporter } from '@/components/import/universal-importer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { 
  FileAudio, 
  FolderOpen, 
  Mail, 
  History,
  Settings,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'

export default async function ImportPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) {
    redirect('/dashboard')
  }

  // Get import history
  const { data: importHistory } = await supabase
    .from('import_history')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .order('started_at', { ascending: false })
    .limit(20)

  // Get watch folders
  const { data: watchFolders } = await supabase
    .from('watch_folders')
    .select('*')
    .eq('organization_id', profile.organization_id)

  // Get email config
  const { data: emailConfig } = await supabase
    .from('organization_email_configs')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .single()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Import</h1>
        <p className="text-gray-600 mt-2">
          Importáljon meetingeket különböző forrásokból
        </p>
      </div>

      <Tabs defaultValue="import" className="space-y-6">
        <TabsList>
          <TabsTrigger value="import">
            <FileAudio className="w-4 h-4 mr-2" />
            Import
          </TabsTrigger>
          <TabsTrigger value="watch">
            <FolderOpen className="w-4 h-4 mr-2" />
            Megfigyelt mappák
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="w-4 h-4 mr-2" />
            Email figyelés
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Előzmények
          </TabsTrigger>
        </TabsList>

        <TabsContent value="import">
          <UniversalImporter organizationId={profile.organization_id} />
        </TabsContent>

        <TabsContent value="watch">
          <Card>
            <CardHeader>
              <CardTitle>Megfigyelt mappák</CardTitle>
              <CardDescription>
                Automatikusan importálja a fájlokat ezekből a mappákból
              </CardDescription>
            </CardHeader>
            <CardContent>
              {watchFolders && watchFolders.length > 0 ? (
                <div className="space-y-4">
                  {watchFolders.map((folder) => (
                    <div key={folder.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{folder.folder_path}</p>
                        <p className="text-sm text-gray-600">{folder.provider}</p>
                      </div>
                      <Badge variant={folder.is_active ? 'default' : 'secondary'}>
                        {folder.is_active ? 'Aktív' : 'Inaktív'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  Még nincs beállítva megfigyelt mappa
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email figyelés</CardTitle>
              <CardDescription>
                Automatikus import email mellékletekből
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailConfig ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <p className="font-medium">{emailConfig.email}</p>
                    <p className="text-sm text-gray-600">
                      IMAP: {emailConfig.imap_host}:{emailConfig.imap_port}
                    </p>
                    <div className="mt-2">
                      <Badge variant={emailConfig.is_active ? 'default' : 'secondary'}>
                        {emailConfig.is_active ? 'Aktív' : 'Inaktív'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-gray-500 mb-4">
                    Még nincs beállítva email figyelés
                  </p>
                  <button className="btn btn-primary">
                    Email beállítása
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Import előzmények</CardTitle>
              <CardDescription>
                Az elmúlt importálások listája
              </CardDescription>
            </CardHeader>
            <CardContent>
              {importHistory && importHistory.length > 0 ? (
                <div className="space-y-2">
                  {importHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{item.filename}</p>
                        <p className="text-sm text-gray-600">
                          {item.source} • {new Date(item.started_at).toLocaleString('hu')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                        {item.status === 'failed' && (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                        {item.status === 'processing' && (
                          <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
                        )}
                        <Badge variant={
                          item.status === 'completed' ? 'default' :
                          item.status === 'failed' ? 'destructive' :
                          'secondary'
                        }>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  Még nincs import előzmény
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}