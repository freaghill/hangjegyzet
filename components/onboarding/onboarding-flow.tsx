'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { 
  Building, 
  Users, 
  Briefcase, 
  Upload, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface OnboardingData {
  companySize: string
  industry: string
  role: string
  mainUseCase: string
  companyName?: string
}

const steps = [
  {
    id: 'welcome',
    title: 'Üdvözöljük a HangJegyzetben!',
    description: 'Néhány kérdéssel személyre szabjuk az élményt'
  },
  {
    id: 'company',
    title: 'Mondjon el többet a cégéről',
    description: 'Segít a megfelelő funkciók ajánlásában'
  },
  {
    id: 'use-case',
    title: 'Mire használná főként?',
    description: 'Így releváns tippeket adhatunk'
  },
  {
    id: 'first-upload',
    title: 'Próbálja ki először!',
    description: 'Töltsön fel egy tesztfájlt'
  }
]

export function OnboardingFlow({ onComplete }: { onComplete?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<OnboardingData>({
    companySize: '',
    industry: '',
    role: '',
    mainUseCase: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const progress = ((currentStep + 1) / steps.length) * 100

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      // Complete onboarding
      await saveOnboardingData()
      onComplete?.()
      router.push('/dashboard')
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleSkip = async () => {
    await saveOnboardingData()
    onComplete?.()
    router.push('/dashboard')
  }

  const saveOnboardingData = async () => {
    setIsLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('user_onboarding')
          .upsert({
            user_id: user.id,
            company_size: data.companySize,
            industry: data.industry,
            role: data.role,
            main_use_case: data.mainUseCase,
            company_name: data.companyName,
            completed_at: new Date().toISOString()
          })
      }
    } catch (error) {
      console.error('Failed to save onboarding data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-10 h-10 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Kezdjük el!</h3>
              <p className="text-gray-600">
                A HangJegyzet segít időt spórolni automatikus meeting jegyzeteléssel.
                Válaszoljon néhány kérdésre, hogy személyre szabhassuk az élményt.
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>💡 Tudta?</strong> Átlagosan 30 percet spórolhat minden meeting után!
              </p>
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="company-name">Cég neve (opcionális)</Label>
                <Input
                  id="company-name"
                  value={data.companyName || ''}
                  onChange={(e) => setData(prev => ({ ...prev, companyName: e.target.value }))}
                  placeholder="Példa Kft."
                />
              </div>

              <div>
                <Label>Cég mérete</Label>
                <RadioGroup
                  value={data.companySize}
                  onValueChange={(value) => setData(prev => ({ ...prev, companySize: value }))}
                >
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="1-10" />
                      <span>1-10 fő</span>
                    </label>
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="11-50" />
                      <span>11-50 fő</span>
                    </label>
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="51-200" />
                      <span>51-200 fő</span>
                    </label>
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="200+" />
                      <span>200+ fő</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Iparág</Label>
                <RadioGroup
                  value={data.industry}
                  onValueChange={(value) => setData(prev => ({ ...prev, industry: value }))}
                >
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="tech" />
                      <span>Technológia / IT</span>
                    </label>
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="consulting" />
                      <span>Tanácsadás</span>
                    </label>
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="legal" />
                      <span>Jogi szolgáltatások</span>
                    </label>
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="healthcare" />
                      <span>Egészségügy</span>
                    </label>
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="other" />
                      <span>Egyéb</span>
                    </label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Az Ön szerepe</Label>
                <RadioGroup
                  value={data.role}
                  onValueChange={(value) => setData(prev => ({ ...prev, role: value }))}
                >
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="executive" />
                      <div>
                        <span className="font-medium">Vezető</span>
                        <p className="text-sm text-gray-600">CEO, CTO, ügyvezető</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="manager" />
                      <div>
                        <span className="font-medium">Középvezető</span>
                        <p className="text-sm text-gray-600">Csapatvezető, projektvezető</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="specialist" />
                      <div>
                        <span className="font-medium">Szakértő</span>
                        <p className="text-sm text-gray-600">Tanácsadó, fejlesztő, elemző</p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Fő felhasználási terület</Label>
                <RadioGroup
                  value={data.mainUseCase}
                  onValueChange={(value) => setData(prev => ({ ...prev, mainUseCase: value }))}
                >
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="client-meetings" />
                      <div>
                        <span className="font-medium">Ügyféltalálkozók</span>
                        <p className="text-sm text-gray-600">Konzultációk, prezentációk</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="team-meetings" />
                      <div>
                        <span className="font-medium">Csapat meetingek</span>
                        <p className="text-sm text-gray-600">Standup, retrospektív, tervezés</p>
                      </div>
                    </label>
                    <label className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50">
                      <RadioGroupItem value="interviews" />
                      <div>
                        <span className="font-medium">Interjúk</span>
                        <p className="text-sm text-gray-600">Állásinterjú, kutatás</p>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Majdnem kész!</h3>
              <p className="text-gray-600">
                Próbálja ki a szolgáltatást egy teszt felvétellel. 
                Vagy ugorja át ezt a lépést és kezdjen bele később.
              </p>
            </div>
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Húzza ide a fájlt vagy</p>
              <Button variant="outline" size="sm">
                Fájl kiválasztása
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                MP3, MP4, WAV, M4A • Max 500MB
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          <div>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        <div className="flex justify-between mt-8">
          {currentStep > 0 ? (
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Vissza
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={handleSkip}
              disabled={isLoading}
            >
              Kihagyás
            </Button>
          )}

          <Button
            onClick={handleNext}
            disabled={isLoading || (currentStep === 1 && (!data.companySize || !data.industry)) || (currentStep === 2 && (!data.role || !data.mainUseCase))}
          >
            {currentStep === steps.length - 1 ? (
              <>
                Befejezés
                <CheckCircle className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                Tovább
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}