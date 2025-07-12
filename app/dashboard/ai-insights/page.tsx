import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PredictiveAnalytics } from '@/components/ai/predictive-analytics'
import { MeetingHealthDashboard } from '@/components/ai/meeting-health-dashboard'
import { SpeakerAnalytics } from '@/components/ai/speaker-analytics'
import { Brain, TrendingUp, Heart, Users, Calendar, Download } from 'lucide-react'

export const metadata: Metadata = {
  title: 'AI Elemzések | HangJegyzet',
  description: 'Mesterséges intelligencia által generált meeting elemzések és előrejelzések',
}

export default async function AIInsightsPage() {
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8" />
              AI Elemzések
            </h1>
            <p className="text-gray-600 mt-1">
              Mesterséges intelligencia által generált betekintések és előrejelzések
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Riport exportálása
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Időszak:</span>
            <Select defaultValue="month">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Elmúlt 7 nap</SelectItem>
                <SelectItem value="month">Elmúlt 30 nap</SelectItem>
                <SelectItem value="quarter">Elmúlt 3 hónap</SelectItem>
                <SelectItem value="year">Elmúlt év</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* AI Features Tabs */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Meeting Egészség
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Előrejelzések
          </TabsTrigger>
          <TabsTrigger value="speakers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Beszélő Elemzés
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Szervezeti Meeting Egészség</CardTitle>
              <CardDescription>
                Átfogó elemzés a meeting kultúráról és hatékonyságról
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MeetingHealthDashboard 
                organizationId={profile.organization_id}
                timeRange="month"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prediktív Elemzések</CardTitle>
              <CardDescription>
                AI alapú előrejelzések és trendek a jövőbeli meetingekhez
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PredictiveAnalytics 
                organizationId={profile.organization_id}
                timeRange="month"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="speakers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Beszélő Teljesítmény</CardTitle>
              <CardDescription>
                Részletes elemzés a résztvevők kommunikációs stílusáról és hatékonyságáról
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SpeakerAnalytics 
                organizationId={profile.organization_id}
                timeRange="month"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Elemzett időszak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">30 nap</p>
            <p className="text-xs text-gray-500 mt-1">
              Folyamatos tanulás és fejlődés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Modellek
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">5 aktív</p>
            <p className="text-xs text-gray-500 mt-1">
              Predikció, elemzés, optimalizáció
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pontosság
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">94%</p>
            <p className="text-xs text-gray-500 mt-1">
              Előrejelzési megbízhatóság
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}