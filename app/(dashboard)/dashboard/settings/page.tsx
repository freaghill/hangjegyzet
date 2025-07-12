'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProfileSettings from '@/components/settings/profile-settings'
import OrganizationSettings from '@/components/settings/organization-settings'
import NotificationSettings from '@/components/settings/notification-settings'
import VocabularySettings from '@/components/settings/vocabulary-settings'
import IntegrationSettings from '@/components/settings/integration-settings'
import BillingSettings from '@/components/settings/billing-settings'
import { useOrganization } from '@/hooks/useOrganization'
import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsPage() {
  const { organization, isLoading, error } = useOrganization()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-red-800">Hiba történt</h3>
          <p className="mt-1 text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800">Nincs szervezet</h3>
          <p className="mt-1 text-sm text-yellow-700">Nem található szervezeti kapcsolat ehhez a fiókhoz.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Beállítások</h1>
        <p className="text-gray-600 mt-2">Fiók és szervezeti beállítások kezelése</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="organization">Szervezet</TabsTrigger>
          <TabsTrigger value="notifications">Értesítések</TabsTrigger>
          <TabsTrigger value="vocabulary">Szótár</TabsTrigger>
          <TabsTrigger value="integrations">Integrációk</TabsTrigger>
          <TabsTrigger value="billing">Számlázás</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="organization" className="space-y-4">
          <OrganizationSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="vocabulary" className="space-y-4">
          <VocabularySettings organizationId={organization?.id || ''} />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <IntegrationSettings />
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <BillingSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}