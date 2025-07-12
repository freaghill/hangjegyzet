'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 text-center">
            <div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Hiba történt
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Sajnáljuk, valami hiba történt. A hibajelentést automatikusan elküldtük a fejlesztőknek.
              </p>
              {error.digest && (
                <p className="mt-2 text-xs text-gray-500">
                  Hiba azonosító: {error.digest}
                </p>
              )}
            </div>
            <div className="space-y-4">
              <Button onClick={reset} className="w-full">
                Próbálja újra
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                Vissza a főoldalra
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}