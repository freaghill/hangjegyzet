'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building, Palette, Users, Settings } from 'lucide-react'
import { BrandingSettings } from '@/components/settings/branding-settings'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

export default function OrganizationSettingsPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadOrganization()
  }, [])

  const loadOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (membership?.organization_id) {
        setOrganizationId(membership.organization_id)
      }
    } catch (error) {
      console.error('Error loading organization:', error)
      toast.error('Hiba a szervezet betöltésekor')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 gap-4">
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!organizationId) {
    return (
      <div className="text-center py-12">
        <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Nincs szervezet
        </h2>
        <p className="text-gray-600">
          Önnek még nincs szervezete. Hozzon létre egyet a funkció használatához.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Szervezeti beállítások</h1>
        <p className="text-gray-600 mt-1">
          Kezelje szervezete beállításait és testreszabási opcióit
        </p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Általános
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Márkajelzés
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Tagok
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Haladó
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Általános beállítások</CardTitle>
              <CardDescription>
                Alapvető szervezeti információk kezelése
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hamarosan elérhető...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding">
          <BrandingSettings organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Tagok kezelése</CardTitle>
              <CardDescription>
                Szervezeti tagok meghívása és jogosultságok kezelése
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hamarosan elérhető...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Haladó beállítások</CardTitle>
              <CardDescription>
                API kulcsok, webhookok és integrációk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hamarosan elérhető...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}