import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle, Users, Clock, Award } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="pt-20 pb-32 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-emerald-50 opacity-70" />
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center">
          {/* Trust indicator */}
          <div className="inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full mb-6">
            <Award className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">
              Már 500+ magyar vállalkozás használja
            </span>
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 tracking-tight sm:text-6xl md:text-7xl leading-tight">
            Soha többé ne veszítsen el
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">
              egyetlen fontos részletet sem
            </span>
          </h1>
          
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            A HangJegyzet automatikusan rögzíti és összefoglalja meeting-jeit. 
            <strong className="text-gray-900"> Spóroljon 30 percet minden megbeszélés után</strong> - 
            nem kell jegyzetelnie, mert AI-unk mindent dokumentál Önnek.
          </p>
          
          {/* Benefits list */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center text-left max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">97%+ pontosság magyarul</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">Kész 2 perc alatt</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">GDPR megfelelő</span>
            </div>
          </div>
          
          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="group text-base px-8 py-6 h-auto">
                Kezdje el ingyen
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="#demo">
              <Button variant="outline" size="lg" className="text-base px-8 py-6 h-auto">
                Nézze meg működés közben
              </Button>
            </Link>
          </div>
          
          <p className="mt-4 text-sm text-gray-500">
            14 napos ingyenes próba • Bankkártya nem szükséges • 5 perc alatt beüzemelhető
          </p>
          
          {/* Social proof */}
          <div className="mt-16 flex items-center justify-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-400" />
              <span className="text-gray-600">500+ aktív felhasználó</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-400" />
              <span className="text-gray-600">50,000+ átírt meeting</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-gray-400" />
              <span className="text-gray-600">4.9/5 értékelés</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}