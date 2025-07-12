'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useOrganization } from '@/hooks/useOrganization'

export default function OrganizationSettings() {
  const { organization, isLoading } = useOrganization()
  const [orgData, setOrgData] = useState({
    name: '',
    slug: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (organization) {
      setOrgData({
        name: organization.name || '',
        slug: organization.slug || '',
      })
    }
  }, [organization])

  async function updateOrganization() {
    if (!organization) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgData.name })
        .eq('id', organization.id)

      if (error) throw error

      toast.success('Szervezet sikeresen frissítve')
    } catch (error) {
      console.error('Error updating organization:', error)
      toast.error('Nem sikerült frissíteni a szervezetet')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return <div>Betöltés...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Szervezet beállítások</CardTitle>
        <CardDescription>Szervezeti adatok és beállítások kezelése</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Szervezet neve</Label>
          <Input
            id="org-name"
            value={orgData.name}
            onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
            placeholder="Szervezet neve"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="org-slug">Szervezet azonosító</Label>
          <Input
            id="org-slug"
            value={orgData.slug}
            disabled
            className="bg-gray-50"
          />
          <p className="text-sm text-gray-500">
            Ez az azonosító nem módosítható
          </p>
        </div>

        <Button 
          onClick={updateOrganization} 
          disabled={saving || !organization}
        >
          {saving ? 'Mentés...' : 'Mentés'}
        </Button>
      </CardContent>
    </Card>
  )
}