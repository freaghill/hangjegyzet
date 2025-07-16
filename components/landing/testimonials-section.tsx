'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

const testimonials = [
  {
    id: 1,
    name: 'Dr. Kovács András',
    role: 'Ügyvéd',
    company: 'Kovács és Társai Ügyvédi Iroda',
    avatar: '/testimonials/kovacs.jpg',
    content: 'A HangJegyzet teljesen megváltoztatta, ahogy az ügyféltalálkozókat dokumentálom. Korábban órákat töltöttem jegyzőkönyvek írásával, most 2 perc alatt megvan. A magyar nyelvű átírás pontossága lenyűgöző, még a jogi szakszavakat is tökéletesen felismeri.',
    rating: 5,
    highlight: 'Heti 10+ óra időmegtakarítás',
    results: [
      '100%-ban pontos jogi dokumentáció',
      'Azonnali jegyzőkönyv küldés ügyfeleknek',
      'Kereshető archívum minden megbeszélésről'
    ]
  },
  {
    id: 2,
    name: 'Nagy Eszter',
    role: 'Projekt Manager',
    company: 'TechStart Kft.',
    avatar: '/testimonials/nagy.jpg',
    content: 'Napi 4-5 meetingem van különböző projekteken. A HangJegyzet nélkül lehetetlen lenne minden részletet követni. Most minden megbeszélés után azonnal tudom küldeni a jegyzőkönyvet a csapatnak, a teendőkkel és határidőkkel együtt.',
    rating: 5,
    highlight: '30 perc spórolás meetingenként',
    results: [
      'Automatikus teendő lista generálás',
      'Csapat szinkronban tartása',
      'Projektek átláthatósága javult 80%-kal'
    ]
  },
  {
    id: 3,
    name: 'Szabó Péter',
    role: 'Értékesítési vezető',
    company: 'SalesForce Hungary',
    avatar: '/testimonials/szabo.jpg',
    content: 'Az értékesítési meetingek dokumentálása mindig problémás volt. Most minden ügyféltalálkozó után van egy részletes összefoglalóm, amit azonnal be tudok vinni a CRM-be. A csapatom imádja, hogy minden információ egy helyen van.',
    rating: 5,
    highlight: '40%-kal több üzletkötés',
    results: [
      'Minden ügyfél igény dokumentálva',
      'Jobb követési stratégia',
      'Értékesítési folyamat optimalizálása'
    ]
  },
  {
    id: 4,
    name: 'Dr. Tóth Katalin',
    role: 'HR vezető',
    company: 'MultiCorp Zrt.',
    avatar: '/testimonials/toth.jpg',
    content: 'Interjúk és teljesítményértékelések rögzítése korábban rengeteg időt vett el. A HangJegyzet segítségével most teljes mértékben a jelöltre vagy munkatársra tudok koncentrálni, miközben minden fontos információ rögzítésre kerül.',
    rating: 5,
    highlight: 'GDPR megfelelő dokumentáció',
    results: [
      'Objektív értékelési dokumentáció',
      'Jobb jelölt élmény az interjúkon',
      'Compliance követelmények teljesítése'
    ]
  },
  {
    id: 5,
    name: 'Molnár Gábor',
    role: 'Tanácsadó',
    company: 'Business Consulting Group',
    avatar: '/testimonials/molnar.jpg',
    content: 'Ügyfél workshopok és stratégiai megbeszélések dokumentálása kulcsfontosságú a munkámban. A HangJegyzet precision módja annyira pontos, hogy a jegyzőkönyveket közvetlenül tudom használni a végső jelentésekben.',
    rating: 5,
    highlight: 'Professzionális dokumentáció percek alatt',
    results: [
      'Ügyfél elégedettség 95% feletti',
      'Jelentések elkészítése 50%-kal gyorsabb',
      'Minden insight dokumentálva'
    ]
  }
]

export function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  const nextTestimonial = () => {
    if (!isAnimating) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length)
        setIsAnimating(false)
      }, 300)
    }
  }

  const prevTestimonial = () => {
    if (!isAnimating) {
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
        setIsAnimating(false)
      }, 300)
    }
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Sikertörténetek magyar vállalkozásoktól
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            Így változtatta meg a HangJegyzet az ő munkájukat
          </p>
        </div>

        {/* Main testimonial showcase */}
        <div className="max-w-4xl mx-auto">
          <Card className={`p-8 md:p-12 transition-all duration-300 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            <div className="flex items-start gap-4 mb-6">
              <Quote className="h-8 w-8 text-blue-600 flex-shrink-0 mt-2" />
              <div className="flex-1">
                <p className="text-lg text-gray-700 italic leading-relaxed">
                  "{currentTestimonial.content}"
                </p>
              </div>
            </div>

            {/* Results */}
            <div className="mt-8 mb-8 p-6 bg-blue-50 rounded-xl">
              <h4 className="font-semibold text-blue-900 mb-3">Eredmények:</h4>
              <ul className="space-y-2">
                {currentTestimonial.results.map((result, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-blue-800">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>{result}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Author info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={currentTestimonial.avatar} />
                  <AvatarFallback>{currentTestimonial.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-gray-900">{currentTestimonial.name}</p>
                  <p className="text-sm text-gray-600">{currentTestimonial.role}, {currentTestimonial.company}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>

            {/* Highlight badge */}
            <div className="mt-6 inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
              <span className="text-lg">🎯</span>
              <span className="font-semibold">{currentTestimonial.highlight}</span>
            </div>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={prevTestimonial}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex gap-2">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex ? 'w-8 bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={nextTestimonial}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Trust indicators */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <div className="text-3xl font-bold text-blue-600">500+</div>
            <p className="text-gray-600 mt-1">Elégedett ügyfél</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600">50,000+</div>
            <p className="text-gray-600 mt-1">Átírt meeting</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600">97%+</div>
            <p className="text-gray-600 mt-1">Pontosság</p>
          </div>
          <div>
            <div className="text-3xl font-bold text-blue-600">4.9/5</div>
            <p className="text-gray-600 mt-1">Átlag értékelés</p>
          </div>
        </div>
      </div>
    </section>
  )
}