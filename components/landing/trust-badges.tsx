import { Shield, Award, Lock, Zap } from 'lucide-react'

export function TrustBadges() {
  return (
    <section className="py-12 bg-white border-y border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900">GDPR Konform</h3>
            <p className="text-sm text-gray-600 mt-1">EU adatvédelem</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
              <Award className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">97%+ Pontosság</h3>
            <p className="text-sm text-gray-600 mt-1">Magyar nyelven</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <Lock className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Titkosított</h3>
            <p className="text-sm text-gray-600 mt-1">256-bit SSL</p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-3">
              <Zap className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900">2 perc alatt</h3>
            <p className="text-sm text-gray-600 mt-1">Kész jegyzőkönyv</p>
          </div>
        </div>
      </div>
    </section>
  )
}