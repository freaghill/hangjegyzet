'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { checkAdminAuthClient } from '@/lib/admin/auth-client'
import { redirect } from 'next/navigation'

// Dynamically import react-admin to avoid SSR issues
const AdminApp = dynamic(() => import('@/components/admin/react-admin-app'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4">Loading admin panel...</p>
      </div>
    </div>
  ),
})

export default function AdminNewPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    checkAdminAuth().then(isAdmin => {
      if (!isAdmin) {
        redirect('/dashboard')
      }
      setIsAuthorized(isAdmin)
    })
  }, [])

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return <div />
  }

  return <AdminApp />
}