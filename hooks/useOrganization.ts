'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface Organization {
  id: string
  name: string
  subscription_tier: string
}

export function useOrganization() {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadOrganization()
  }, [])

  const loadOrganization = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      console.log('User auth check:', { user, userError })
      
      if (userError) {
        console.error('Auth error:', userError)
        setError(`Authentication error: ${userError.message}`)
        setIsLoading(false)
        return
      }
      
      if (!user) {
        setError('Not authenticated')
        setIsLoading(false)
        return
      }

      // Get user's profile with organization
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id, name, role')
        .eq('id', user.id)
        .single()

      console.log('Profile query result:', { profile, profileError })

      if (profileError) {
        console.error('Profile error:', profileError)
        setError(`Profile error: ${profileError.message}`)
        setIsLoading(false)
        return
      }
      
      if (!profile || !profile.organization_id) {
        setError('No organization associated with this profile')
        setIsLoading(false)
        return
      }

      // Get organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, subscription_tier')
        .eq('id', profile.organization_id)
        .single()

      console.log('Organization query result:', { org, orgError })

      if (orgError) {
        console.error('Organization error:', orgError)
        setError(`Organization error: ${orgError.message}`)
        setIsLoading(false)
        return
      }
      
      if (!org) {
        setError('Organization not found')
        setIsLoading(false)
        return
      }

      setOrganization(org)
      setError(null)
    } catch (err) {
      console.error('Error loading organization:', err)
      setError(`Failed to load organization: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return { organization, isLoading, error, refresh: loadOrganization }
}