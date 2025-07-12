'use client'

import { useState } from 'react'
import { Metadata } from 'next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Mail, Phone, MapPin, MessageSquare, Clock, Send } from 'lucide-react'
import { toast } from 'sonner'

// export const metadata: Metadata = {
//   title: 'Kapcsolat - HangJegyzet.AI',
//   description: 'Vegye fel velünk a kapcsolatot. Kérdések, észrevételek, partnerség vagy támogatás.',
// }

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: 'general',
    message: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // In production, this would send to your API
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast.success('Üzenetét megkaptuk! Hamarosan jelentkezünk.')
      setFormData({
        name: '',
        email: '',
        company: '',
        subject: 'general',
        message: '',
      })
    } catch (error) {
      toast.error('Hiba történt az üzenet küldése során. Kérjük próbálja újra.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <section className="pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Beszéljünk a <span className="text-blue-600">projektjéről</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Kérdése van? Egyedi igénye? Partnerséget ajánlana? 
            Örömmel segítünk és válaszolunk minden megkeresésre.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 pb-20">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Elérhetőségek</CardTitle>
                <CardDescription>
                  Válasszon a kapcsolatfelvételi lehetőségek közül
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Email</p>
                    <a href="mailto:hello@hangjegyzet.ai" className="text-sm text-gray-600 hover:text-blue-600">
                      hello@hangjegyzet.ai
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Telefon</p>
                    <a href="tel:+3612345678" className="text-sm text-gray-600 hover:text-blue-600">
                      +36 1 234 5678
                    </a>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Iroda</p>
                    <p className="text-sm text-gray-600">
                      Budapest, Magyarország<br />
                      1051 Budapest, Szabadság tér 7.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Munkaidő</p>
                    <p className="text-sm text-gray-600">
                      Hétfő - Péntek: 9:00 - 17:00<br />
                      Hétvége: Zárva
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Contacts */}
            <Card>
              <CardHeader>
                <CardTitle>Részlegek</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">Értékesítés</p>
                  <a href="mailto:sales@hangjegyzet.ai" className="text-sm text-blue-600 hover:underline">
                    sales@hangjegyzet.ai
                  </a>
                </div>
                <div>
                  <p className="font-medium">Támogatás</p>
                  <a href="mailto:support@hangjegyzet.ai" className="text-sm text-blue-600 hover:underline">
                    support@hangjegyzet.ai
                  </a>
                </div>
                <div>
                  <p className="font-medium">Partnerség</p>
                  <a href="mailto:partners@hangjegyzet.ai" className="text-sm text-blue-600 hover:underline">
                    partners@hangjegyzet.ai
                  </a>
                </div>
                <div>
                  <p className="font-medium">Média</p>
                  <a href="mailto:press@hangjegyzet.ai" className="text-sm text-blue-600 hover:underline">
                    press@hangjegyzet.ai
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Response Time */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Gyors válaszidő
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">
                  Általában 24 órán belül válaszolunk minden megkeresésre munkanapokon.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Üzenet küldése</CardTitle>
                <CardDescription>
                  Töltse ki az űrlapot és hamarosan felvesszük Önnel a kapcsolatot
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Név *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Példa János"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        placeholder="janos@pelda.hu"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company">Cég neve</Label>
                    <Input
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      placeholder="Példa Kft."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Téma *</Label>
                    <Select 
                      value={formData.subject} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon témát" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Általános kérdés</SelectItem>
                        <SelectItem value="sales">Értékesítés / Árajánlat</SelectItem>
                        <SelectItem value="support">Technikai támogatás</SelectItem>
                        <SelectItem value="partnership">Partnerség</SelectItem>
                        <SelectItem value="enterprise">Enterprise megoldások</SelectItem>
                        <SelectItem value="demo">Demo kérés</SelectItem>
                        <SelectItem value="other">Egyéb</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Üzenet *</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      required
                      placeholder="Írja le miben segíthetünk..."
                      rows={6}
                    />
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                    <p>
                      Az űrlap elküldésével elfogadja{' '}
                      <a href="/privacy" className="text-blue-600 hover:underline">
                        adatvédelmi szabályzatunkat
                      </a>
                      . Adatait bizalmasan kezeljük és csak a kapcsolatfelvételhez használjuk.
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    size="lg" 
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      'Küldés...'
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Üzenet küldése
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* FAQ CTA */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">
            Gyakori kérdése van?
          </h2>
          <p className="text-gray-600 mb-6">
            Tekintse meg a gyakran ismételt kérdéseket vagy böngésszen a dokumentációban.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="outline" asChild>
              <a href="/faq">GYIK megtekintése</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/docs">Dokumentáció</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}