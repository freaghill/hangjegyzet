'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { X, Cookie, Settings } from 'lucide-react'
import { analytics } from '@/lib/analytics'
import Link from 'next/link'

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true
    functional: false,
    analytics: false,
    marketing: false,
  })

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000)
    } else {
      // Load saved preferences
      try {
        const saved = JSON.parse(consent)
        setPreferences(saved)
        // Apply analytics consent
        if (saved.analytics) {
          analytics.setConsent(true)
        }
      } catch (e) {
        console.error('Failed to parse cookie consent', e)
      }
    }
  }, [])

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      functional: true,
      analytics: true,
      marketing: true,
    }
    setPreferences(allAccepted)
    savePreferences(allAccepted)
    analytics.setConsent(true)
    setShowBanner(false)
  }

  const acceptNecessary = () => {
    const onlyNecessary = {
      necessary: true,
      functional: false,
      analytics: false,
      marketing: false,
    }
    setPreferences(onlyNecessary)
    savePreferences(onlyNecessary)
    analytics.setConsent(false)
    setShowBanner(false)
  }

  const saveCustomPreferences = () => {
    savePreferences(preferences)
    analytics.setConsent(preferences.analytics)
    setShowBanner(false)
    setShowSettings(false)
  }

  const savePreferences = (prefs: typeof preferences) => {
    localStorage.setItem('cookie-consent', JSON.stringify(prefs))
    localStorage.setItem('cookie-consent-date', new Date().toISOString())
  }

  if (!showBanner && !showSettings) return null

  return (
    <>
      {/* Main Banner */}
      {showBanner && !showSettings && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 backdrop-blur-sm border-t shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
              <Cookie className="w-6 h-6 text-blue-600 flex-shrink-0" />
              
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  🍪 Ez a weboldal sütiket használ
                </h3>
                <p className="text-sm text-gray-600">
                  Sütiket használunk a felhasználói élmény javítása, a teljesítmény mérése és a 
                  szolgáltatásaink fejlesztése érdekében. Az "Összes elfogadása" gombra kattintva 
                  hozzájárul az összes süti használatához. További információért olvassa el {' '}
                  <Link href="/cookie-policy" className="text-blue-600 hover:underline">
                    Süti szabályzatunkat
                  </Link>.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSettings(true)}
                  className="w-full sm:w-auto"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Beállítások
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={acceptNecessary}
                  className="w-full sm:w-auto"
                >
                  Csak szükséges
                </Button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="w-full sm:w-auto"
                >
                  Összes elfogadása
                </Button>
              </div>

              <button
                onClick={() => setShowBanner(false)}
                className="absolute top-4 right-4 lg:static"
                aria-label="Bezárás"
              >
                <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Süti beállítások</h2>
                <button
                  onClick={() => {
                    setShowSettings(false)
                    setShowBanner(true)
                  }}
                  aria-label="Bezárás"
                >
                  <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
                </button>
              </div>

              <p className="text-gray-600 mb-6">
                Itt testreszabhatja, hogy mely sütiket engedélyezi. A szükséges sütik nem 
                kapcsolhatók ki, mert elengedhetetlenek a weboldal működéséhez.
              </p>

              <div className="space-y-6">
                {/* Necessary Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">Szükséges sütik</h3>
                      <p className="text-sm text-gray-600">
                        Ezek a sütik elengedhetetlenek a weboldal alapvető funkcióihoz
                      </p>
                    </div>
                    <Switch checked disabled />
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    <p>Példák: munkamenet sütik, biztonsági tokenek, nyelvi preferenciák</p>
                  </div>
                </div>

                {/* Functional Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">Funkcionális sütik</h3>
                      <p className="text-sm text-gray-600">
                        Javítják a felhasználói élményt személyre szabott funkciókkal
                      </p>
                    </div>
                    <Switch
                      checked={preferences.functional}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, functional: checked }))
                      }
                    />
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    <p>Példák: felhasználói beállítások, téma választás, lejátszási sebesség</p>
                  </div>
                </div>

                {/* Analytics Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">Analitikai sütik</h3>
                      <p className="text-sm text-gray-600">
                        Segítenek megérteni, hogyan használják a látogatók a weboldalt
                      </p>
                    </div>
                    <Switch
                      checked={preferences.analytics}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, analytics: checked }))
                      }
                    />
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    <p>Példák: Google Analytics, Vercel Analytics, hőtérképek</p>
                  </div>
                </div>

                {/* Marketing Cookies */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">Marketing sütik</h3>
                      <p className="text-sm text-gray-600">
                        Releváns hirdetések megjelenítésére használjuk
                      </p>
                    </div>
                    <Switch
                      checked={preferences.marketing}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({ ...prev, marketing: checked }))
                      }
                    />
                  </div>
                  <div className="text-sm text-gray-500 mt-2">
                    <p>Példák: Facebook Pixel, Google Ads, LinkedIn Insight</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSettings(false)
                    setShowBanner(true)
                  }}
                  className="flex-1"
                >
                  Mégse
                </Button>
                <Button
                  onClick={saveCustomPreferences}
                  className="flex-1"
                >
                  Beállítások mentése
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                További információért olvassa el {' '}
                <Link href="/privacy" className="text-blue-600 hover:underline">
                  Adatvédelmi szabályzatunkat
                </Link> és {' '}
                <Link href="/cookie-policy" className="text-blue-600 hover:underline">
                  Süti szabályzatunkat
                </Link>.
              </p>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}