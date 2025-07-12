'use client'

import { useEffect, useState } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Check if iOS
    const checkIOS = () => {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    }
    setIsIOS(checkIOS())

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      // Show prompt after 30 seconds or 3 page views
      const visitCount = parseInt(localStorage.getItem('visitCount') || '0') + 1
      localStorage.setItem('visitCount', visitCount.toString())
      
      if (visitCount >= 3) {
        setTimeout(() => setShowPrompt(true), 2000)
      } else {
        setTimeout(() => setShowPrompt(true), 30000)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // iOS doesn't support beforeinstallprompt, show custom prompt
    if (checkIOS() && !window.navigator.standalone) {
      setTimeout(() => setShowPrompt(true), 5000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    }
    
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Don't show again for 7 days
    localStorage.setItem('installPromptDismissed', Date.now().toString())
  }

  if (!showPrompt) return null

  // iOS specific prompt
  if (isIOS) {
    return (
      <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-slide-up">
        <Card className="bg-white shadow-xl border-0">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Smartphone className="h-10 w-10 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">
                  Telepítse a HangJegyzet alkalmazást
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Érintse meg a <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V13a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M4 9a1 1 0 011 1v6a1 1 0 001 1h8a1 1 0 001-1v-6a1 1 0 112 0v6a3 3 0 01-3 3H6a3 3 0 01-3-3v-6a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                  </span> gombot, majd válassza a "Hozzáadás a kezdőképernyőhöz" lehetőséget
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Android/Desktop prompt
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-slide-up">
      <Card className="bg-white shadow-xl border-0 max-w-md mx-auto">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <Download className="h-10 w-10 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Telepítse a HangJegyzet alkalmazást
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Férjen hozzá a meetingekhez offline is, és kapjon értesítéseket
              </p>
              <div className="flex space-x-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstallClick}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Telepítés
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDismiss}
                >
                  Később
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}