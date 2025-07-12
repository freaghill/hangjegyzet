'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

export default function ProfileSettings() {
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile({
        full_name: data.full_name || '',
        email: user.email || '',
      })
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Nem sikerült betölteni a profilt')
    } finally {
      setLoading(false)
    }
  }

  async function updateProfile() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: profile.full_name })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Profil sikeresen frissítve')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Nem sikerült frissíteni a profilt')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div>Betöltés...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Személyes adatok</CardTitle>
        <CardDescription>Fiók és profil beállítások kezelése</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email cím</Label>
          <Input
            id="email"
            type="email"
            value={profile.email}
            disabled
            className="bg-gray-50"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="name">Teljes név</Label>
          <Input
            id="name"
            value={profile.full_name}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            placeholder="Adja meg a nevét"
          />
        </div>

        <Button 
          onClick={updateProfile} 
          disabled={saving}
        >
          {saving ? 'Mentés...' : 'Mentés'}
        </Button>
      </CardContent>
    </Card>
  )
}