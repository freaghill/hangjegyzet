'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function AcceptInvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('Érvénytelen meghívó link')
      return
    }

    acceptInvitation()
  }, [token])

  const acceptInvitation = async () => {
    try {
      const response = await fetch('/api/teams/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to accept invitation')
      }

      const { teamId } = await response.json()
      setStatus('success')
      
      // Redirect to team page after short delay
      setTimeout(() => {
        router.push('/teams')
      }, 2000)
    } catch (error) {
      console.error('Error accepting invitation:', error)
      setStatus('error')
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Hiba történt a meghívó elfogadása során'
      )
    }
  }

  return (
    <div className="container max-w-md mx-auto py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Csapat meghívó</CardTitle>
          <CardDescription>
            {status === 'loading' && 'Meghívó feldolgozása...'}
            {status === 'success' && 'Meghívó sikeresen elfogadva!'}
            {status === 'error' && 'Hiba történt'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600">
                Kérjük várjon, míg feldolgozzuk a meghívót...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
              <p className="text-gray-700">
                Sikeresen csatlakozott a csapathoz!
              </p>
              <p className="text-sm text-gray-600">
                Átirányítjuk a csapatok oldalra...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="h-12 w-12 text-red-600 mx-auto" />
              <p className="text-gray-700">
                {errorMessage}
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  onClick={() => router.push('/teams')}
                  className="w-full"
                >
                  Csapatok megtekintése
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push('/')}
                  className="w-full"
                >
                  Vissza a főoldalra
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}