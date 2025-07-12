'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <CardTitle>Hiba történt</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            Sajnáljuk, de valami hiba történt az oldal betöltése közben.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="bg-gray-100 rounded-lg p-4">
              <p className="font-mono text-sm text-red-600 whitespace-pre-wrap">
                {error.message}
              </p>
            </div>
          )}
          
          <div className="flex gap-4">
            <Button onClick={reset}>
              Próbálja újra
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
            >
              Vissza a dashboardra
            </Button>
          </div>
          
          {error.digest && (
            <p className="text-xs text-gray-500">
              Hiba azonosító: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}