'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { 
  HeadphonesIcon, 
  MessageSquare, 
  Clock, 
  Mail, 
  FileText,
  AlertCircle,
  CheckCircle,
  Phone,
  Globe,
  Zap,
  Shield,
  Users,
  ArrowRight,
  BookOpen,
  Send
} from 'lucide-react'
import { toast } from 'sonner'

const support_channels = [
  {
    icon: Mail,
    title: 'Email támogatás',
    description: 'Részletes segítség email-en keresztül',
    details: 'support@hangjegyzet.ai',
    responseTime: '24 óra',
    bestFor: 'Részletes kérdések, dokumentáció küldés'
  },
  {
    icon: MessageSquare,
    title: 'Élő chat',
    description: 'Azonnali segítség munkaidőben',
    details: 'Elérhető: H-P 9:00-17:00',
    responseTime: '< 5 perc',
    bestFor: 'Gyors kérdések, azonnali segítség'
  },
  {
    icon: Phone,
    title: 'Telefonos támogatás',
    description: 'Közvetlen beszélgetés szakértőinkkel',
    details: '+36 1 234 5678',
    responseTime: 'Azonnal',
    bestFor: 'Sürgős esetek, komplex problémák'
  }
]

const common_issues = [
  {
    category: 'Feltöltés és transzkripció',
    issues: [
      {
        question: 'Miért nem töltődik fel a fájlom?',
        answer: 'Ellenőrizze a fájl méretét (max 500MB) és formátumát (MP3, WAV, M4A, MP4). Győződjön meg róla, hogy stabil az internetkapcsolata.'
      },
      {
        question: 'A transzkripció nem pontos',
        answer: 'A transzkripció pontossága függ a hangminőségtől. Tiszta, zajmentes felvételek esetén 95%+ pontosság érhető el. Utólag szerkesztheti a szöveget.'
      },
      {
        question: 'Mennyi ideig tart a feldolgozás?',
        answer: 'Általában a fájl hosszának 10-20%-a. Egy 60 perces felvétel kb. 6-12 perc alatt készül el.'
      }
    ]
  },
  {
    category: 'Fiók és számlázás',
    issues: [
      {
        question: 'Hogyan módosíthatom az előfizetésemet?',
        answer: 'A Beállítások > Számlázás menüpontban bármikor módosíthatja, frissítheti vagy lemondhatja előfizetését.'
      },
      {
        question: 'Elfelejtett jelszó visszaállítása',
        answer: 'A bejelentkezési oldalon kattintson az "Elfelejtett jelszó" linkre, adja meg email címét és követse az utasításokat.'
      },
      {
        question: 'Hogyan kérhetek számlát?',
        answer: 'A számlák automatikusan generálódnak minden hónap elején. A Beállítások > Számlázás > Számlatörténet menüpontban töltheti le őket.'
      }
    ]
  },
  {
    category: 'Csapatmunka és megosztás',
    issues: [
      {
        question: 'Hogyan hívhatok meg csapattagokat?',
        answer: 'A Csapat menüpontban kattintson a "Tag meghívása" gombra, adja meg az email címet és válassza ki a jogosultságokat.'
      },
      {
        question: 'Ki férhet hozzá a meetingjeimhez?',
        answer: 'Alapértelmezés szerint csak Ön. Megoszthatja őket csapattagokkal vagy külső felekkel egyedi linkeken keresztül.'
      },
      {
        question: 'Hogyan állíthatok be jogosultságokat?',
        answer: 'A Beállítások > Csapat menüpontban minden tag mellett megtalálja a jogosultság beállításokat (Tulajdonos, Szerkesztő, Néző).'
      }
    ]
  }
]

const priority_levels = [
  { value: 'low', label: 'Alacsony', description: 'Általános kérdés vagy javaslat' },
  { value: 'medium', label: 'Közepes', description: 'Funkcionális probléma, de van megoldás' },
  { value: 'high', label: 'Magas', description: 'Blokkoló hiba, nem tudok dolgozni' },
  { value: 'urgent', label: 'Sürgős', description: 'Kritikus üzleti hatás' }
]

export default function SupportPage() {
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: '',
    attachments: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // In production, this would submit to your support system
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast.success('Support ticket sikeresen létrehozva! Ticket ID: #12345')
      setTicketForm({
        subject: '',
        category: '',
        priority: 'medium',
        description: '',
        attachments: []
      })
    } catch (error) {
      toast.error('Hiba történt a ticket létrehozása során')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <section className="pt-20 pb-16 px-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Támogatási központ
          </h1>
          <p className="text-xl text-purple-100 max-w-3xl mx-auto">
            Professzionális segítség amikor szüksége van rá. 
            Csapatunk elkötelezett az Ön sikeréért.
          </p>
        </div>
      </section>

      {/* Support Status */}
      <div className="bg-white border-b py-4 px-4">
        <div className="max-w-6xl mx-auto">
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Minden rendszer működik.</strong> Átlagos válaszidő: &lt; 2 óra
            </AlertDescription>
          </Alert>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Support Channels */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">
            Válassza ki a megfelelő támogatási csatornát
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {support_channels.map((channel, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <channel.icon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{channel.title}</CardTitle>
                      <CardDescription>{channel.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>Válaszidő: {channel.responseTime}</span>
                    </div>
                    <div className="text-sm font-medium text-purple-600">
                      {channel.details}
                    </div>
                    <div className="text-xs text-gray-500">
                      Legjobb: {channel.bestFor}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Common Issues */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">
            Gyakori problémák és megoldások
          </h2>
          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="space-y-4">
              {common_issues.map((category, categoryIndex) => (
                <Card key={categoryIndex}>
                  <CardHeader>
                    <CardTitle className="text-lg">{category.category}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible>
                      {category.issues.map((issue, issueIndex) => (
                        <AccordionItem key={issueIndex} value={`${categoryIndex}-${issueIndex}`}>
                          <AccordionTrigger className="text-left">
                            {issue.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-600">
                            {issue.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Create Support Ticket */}
        <section className="mb-16">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>Support ticket létrehozása</CardTitle>
              <CardDescription>
                Ha nem találta meg a választ, hozzon létre egy ticketet és szakértőink segítenek
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Tárgy *</Label>
                    <Input
                      id="subject"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                      required
                      placeholder="Rövid leírás a problémáról"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategória *</Label>
                    <Select 
                      value={ticketForm.category} 
                      onValueChange={(value) => setTicketForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Válasszon kategóriát" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technical">Technikai probléma</SelectItem>
                        <SelectItem value="billing">Számlázás</SelectItem>
                        <SelectItem value="account">Fiók kezelés</SelectItem>
                        <SelectItem value="feature">Funkció kérés</SelectItem>
                        <SelectItem value="integration">Integráció</SelectItem>
                        <SelectItem value="other">Egyéb</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Prioritás *</Label>
                  <Select 
                    value={ticketForm.priority} 
                    onValueChange={(value) => setTicketForm(prev => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {priority_levels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div>
                            <div className="font-medium">{level.label}</div>
                            <div className="text-xs text-gray-500">{level.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Részletes leírás *</Label>
                  <Textarea
                    id="description"
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                    required
                    placeholder="Írja le részletesen a problémát, beleértve a reprodukálás lépéseit..."
                    rows={6}
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Tipp:</strong> Minél részletesebb információt ad meg, annál gyorsabban tudunk segíteni. 
                    Képernyőképeket a support@hangjegyzet.ai címre küldhet.
                  </AlertDescription>
                </Alert>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Ticket létrehozása...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Support ticket létrehozása
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Additional Resources */}
        <section className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Dokumentáció
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Részletes útmutatók és API dokumentáció
              </p>
              <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/docs">
                  Dokumentáció megnyitása
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Közösség
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Csatlakozzon felhasználóink közösségéhez
              </p>
              <Button variant="outline" size="sm" asChild className="w-full">
                <a href="https://community.hangjegyzet.ai" target="_blank" rel="noopener noreferrer">
                  Közösség megtekintése
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Rendszer státusz
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Valós idejű rendszer állapot és karbantartások
              </p>
              <Button variant="outline" size="sm" asChild className="w-full">
                <a href="https://status.hangjegyzet.ai" target="_blank" rel="noopener noreferrer">
                  Státusz oldal
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}