'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function ServiceWorkerProvider() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.workbox !== undefined
    ) {
      const wb = window.workbox

      // Add event listeners to handle service worker lifecycle
      wb.addEventListener('activated', (event) => {
        console.log('Service worker activated:', event)
      })

      wb.addEventListener('waiting', () => {
        // Show update prompt
        toast('Új verzió elérhető!', {
          action: {
            label: 'Frissítés',
            onClick: () => {
              wb.addEventListener('controlling', () => {
                window.location.reload()
              })
              wb.messageSkipWaiting()
            },
          },
          duration: Infinity,
        })
      })

      // Register service worker
      wb.register()
    }

    // Manual service worker registration for custom SW
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered:', registration)

            // Check for updates periodically
            setInterval(() => {
              registration.update()
            }, 60 * 60 * 1000) // Every hour

            // Handle updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing
              if (!newWorker) return

              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available
                  toast('Új verzió elérhető!', {
                    action: {
                      label: 'Frissítés',
                      onClick: () => {
                        newWorker.postMessage({ type: 'SKIP_WAITING' })
                        window.location.reload()
                      },
                    },
                    duration: Infinity,
                  })
                }
              })
            })
          })
          .catch((error) => {
            console.error('SW registration failed:', error)
          })
      })
    }

    // Handle offline/online events
    const handleOnline = () => {
      toast.success('Kapcsolat helyreállt')
    }

    const handleOffline = () => {
      toast.error('Nincs internetkapcsolat', {
        duration: Infinity,
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return null
}