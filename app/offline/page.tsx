import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <WifiOff className="h-8 w-8 text-gray-500" />
          </div>
          
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">
            Offline módban van
          </h1>
          
          <p className="text-gray-600 mb-8">
            Úgy tűnik, nincs internetkapcsolata. Kérjük, ellenőrizze a hálózati beállításait, majd próbálja újra.
          </p>

          <div className="space-y-4">
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
              variant="default"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Újratöltés
            </Button>

            <Button
              onClick={() => window.history.back()}
              className="w-full"
              variant="outline"
            >
              Vissza
            </Button>
          </div>

          <div className="mt-12 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-sm font-medium text-blue-900 mb-2">
              Mit tehet offline módban?
            </h2>
            <ul className="text-sm text-blue-700 space-y-1 text-left">
              <li>• Megtekintheti a korábban betöltött tartalmakat</li>
              <li>• Folytathatja a munkát a mentett dokumentumokon</li>
              <li>• A változtatások szinkronizálódnak, amikor visszatér a kapcsolat</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}