'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  ArrowRight, 
  ArrowLeft,
  Check,
  Info,
  Calculator,
  TrendingUp,
  Shield,
  Gift,
  Zap,
  Scale,
  Target
} from 'lucide-react'
import { toast } from 'sonner'
import { SUBSCRIPTION_PLANS, getSubscriptionPlan } from '@/lib/payments/subscription-plans'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

interface MigrationWizardProps {
  currentPlan: string
  organizationId: string
  onComplete?: () => void
}

interface MigrationOption {
  planId: string
  recommended: boolean
  savings?: number
  benefits: string[]
}

type Step = 'intro' | 'analysis' | 'comparison' | 'selection' | 'benefits' | 'confirmation' | 'complete'

export function MigrationWizard({ currentPlan, organizationId, onComplete }: MigrationWizardProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('intro')
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [usageAnalysis, setUsageAnalysis] = useState<any>(null)
  const [migrationOptions, setMigrationOptions] = useState<MigrationOption[]>([])
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [wantsGrandfathering, setWantsGrandfathering] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (step === 'analysis') {
      analyzeUsage()
    }
  }, [step])

  const analyzeUsage = async () => {
    setLoading(true)
    try {
      // Get historical usage data
      const { data: usage } = await supabase
        .from('meetings')
        .select('duration_seconds, created_at, metadata')
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (!usage) return

      // Calculate usage patterns
      const totalMinutes = usage.reduce((sum, m) => sum + Math.ceil(m.duration_seconds / 60), 0) / 3
      const avgMeetingLength = usage.length > 0 
        ? usage.reduce((sum, m) => sum + m.duration_seconds, 0) / usage.length / 60
        : 0

      // Analyze audio quality from metadata
      const qualityDistribution = usage.reduce((acc, m) => {
        const quality = m.metadata?.audioQuality || 'unknown'
        acc[quality] = (acc[quality] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Generate recommendations
      const analysis = {
        monthlyAverage: Math.round(totalMinutes),
        avgMeetingLength: Math.round(avgMeetingLength),
        totalMeetings: usage.length,
        qualityDistribution,
        recommendedModeDistribution: calculateRecommendedModes(qualityDistribution, usage.length)
      }

      setUsageAnalysis(analysis)

      // Calculate migration options
      const options = calculateMigrationOptions(analysis, currentPlan)
      setMigrationOptions(options)

    } catch (error) {
      console.error('Usage analysis error:', error)
      toast.error('Nem sikerült elemezni a használati adatokat')
    } finally {
      setLoading(false)
    }
  }

  const calculateRecommendedModes = (quality: Record<string, number>, total: number) => {
    const excellent = (quality.excellent || 0) / total
    const good = (quality.good || 0) / total
    const fair = (quality.fair || 0) / total
    const poor = (quality.poor || 0) / total

    return {
      fast: Math.round((excellent + good * 0.7) * 100),
      balanced: Math.round((good * 0.3 + fair * 0.8 + poor * 0.5) * 100),
      precision: Math.round((fair * 0.2 + poor * 0.5) * 100)
    }
  }

  const calculateMigrationOptions = (analysis: any, current: string): MigrationOption[] => {
    const options: MigrationOption[] = []
    const currentPlanDetails = SUBSCRIPTION_PLANS[current]
    
    // Calculate required allocations
    const requiredFast = analysis.monthlyAverage * (analysis.recommendedModeDistribution.fast / 100)
    const requiredBalanced = analysis.monthlyAverage * (analysis.recommendedModeDistribution.balanced / 100)
    const requiredPrecision = analysis.monthlyAverage * (analysis.recommendedModeDistribution.precision / 100)

    // Check each new plan
    for (const [planId, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      if (planId === 'trial') continue

      const fits = 
        (plan.limits.modeAllocation.fast === -1 || plan.limits.modeAllocation.fast >= requiredFast) &&
        (plan.limits.modeAllocation.balanced === -1 || plan.limits.modeAllocation.balanced >= requiredBalanced) &&
        (plan.limits.modeAllocation.precision === -1 || plan.limits.modeAllocation.precision >= requiredPrecision)

      if (fits) {
        const priceDiff = plan.price - (currentPlanDetails?.price || 0)
        
        options.push({
          planId,
          recommended: planId === 'profi' || planId === 'vallalati',
          savings: priceDiff < 0 ? Math.abs(priceDiff) : undefined,
          benefits: getBenefits(planId, current)
        })
      }
    }

    return options.sort((a, b) => {
      if (a.recommended && !b.recommended) return -1
      if (!a.recommended && b.recommended) return 1
      return 0
    })
  }

  const getBenefits = (newPlan: string, oldPlan: string): string[] => {
    const benefits = []
    const newDetails = SUBSCRIPTION_PLANS[newPlan]
    const oldDetails = SUBSCRIPTION_PLANS[oldPlan]

    if (!newDetails || !oldDetails) return []

    // Compare allocations
    if (newDetails.limits.modeAllocation.fast > oldDetails.limits.modeAllocation.fast) {
      benefits.push(`${newDetails.limits.modeAllocation.fast} perc Fast mód (volt: ${oldDetails.limits.modeAllocation.fast})`)
    }
    if (newDetails.limits.modeAllocation.balanced > oldDetails.limits.modeAllocation.balanced) {
      benefits.push(`${newDetails.limits.modeAllocation.balanced} perc Balanced mód`)
    }
    if (newDetails.limits.modeAllocation.precision > 0 && oldDetails.limits.modeAllocation.precision === 0) {
      benefits.push('Precision mód elérhetővé válik')
    }

    // Add plan-specific benefits
    if (newPlan === 'multinational') {
      benefits.push('Korlátlan Fast mód használat')
      benefits.push('Dedikált support')
    }

    return benefits
  }

  const handleMigration = async () => {
    if (!selectedPlan || !acceptTerms) return

    setLoading(true)
    try {
      const response = await fetch('/api/subscription/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPlan: selectedPlan,
          grandfathering: wantsGrandfathering
        })
      })

      if (!response.ok) throw new Error('Migration failed')

      setStep('complete')
      toast.success('Sikeres migráció az új csomagra!')
      
      setTimeout(() => {
        onComplete?.()
        router.push('/dashboard')
      }, 3000)

    } catch (error) {
      console.error('Migration error:', error)
      toast.error('Migráció sikertelen. Kérjük próbálja újra.')
    } finally {
      setLoading(false)
    }
  }

  const steps: Record<Step, { title: string; description: string }> = {
    intro: {
      title: 'Üdvözöljük az új árazási rendszerben',
      description: 'Segítünk kiválasztani a legjobb csomagot az Ön számára'
    },
    analysis: {
      title: 'Használati elemzés',
      description: 'Elemezzük az elmúlt 3 hónap használati adatait'
    },
    comparison: {
      title: 'Csomag összehasonlítás',
      description: 'Hasonlítsa össze a jelenlegi és az új lehetőségeket'
    },
    selection: {
      title: 'Csomag kiválasztása',
      description: 'Válassza ki az Önnek megfelelő új csomagot'
    },
    benefits: {
      title: 'Előnyök és kedvezmények',
      description: 'Különleges ajánlatok korai átállóknak'
    },
    confirmation: {
      title: 'Megerősítés',
      description: 'Tekintse át és erősítse meg választását'
    },
    complete: {
      title: 'Sikeres migráció',
      description: 'Üdvözöljük az új csomagban!'
    }
  }

  const currentStepIndex = Object.keys(steps).indexOf(step)
  const progress = ((currentStepIndex + 1) / Object.keys(steps).length) * 100

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{steps[step].title}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[step].title}</CardTitle>
          <CardDescription>{steps[step].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'intro' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-6">
                <h3 className="font-semibold mb-3">Mi változik?</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>3 átírási mód közül választhat minden meetinghez</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>Jobb kontroll a költségek és pontosság felett</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5" />
                    <span>Ugyanazért az árért több percet kap</span>
                  </li>
                </ul>
              </div>
              
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Jelenlegi csomagja: <strong>{SUBSCRIPTION_PLANS[currentPlan]?.name}</strong> - {SUBSCRIPTION_PLANS[currentPlan]?.price} Ft/hó
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 'analysis' && (
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Használati adatok elemzése...</p>
                </div>
              ) : usageAnalysis ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{usageAnalysis.monthlyAverage}</div>
                        <p className="text-sm text-gray-600">perc/hó átlag</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{usageAnalysis.avgMeetingLength}</div>
                        <p className="text-sm text-gray-600">perc/meeting</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{usageAnalysis.totalMeetings}</div>
                        <p className="text-sm text-gray-600">meeting/3 hónap</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="font-semibold mb-4">Ajánlott mód eloszlás az Ön használata alapján</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Fast', value: usageAnalysis.recommendedModeDistribution.fast, color: '#10b981' },
                              { name: 'Balanced', value: usageAnalysis.recommendedModeDistribution.balanced, color: '#3b82f6' },
                              { name: 'Precision', value: usageAnalysis.recommendedModeDistribution.precision, color: '#f59e0b' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {[0, 1, 2].map((index) => (
                              <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#f59e0b'][index]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {step === 'comparison' && migrationOptions.length > 0 && (
            <div className="space-y-4">
              {migrationOptions.map((option) => {
                const plan = SUBSCRIPTION_PLANS[option.planId]
                if (!plan) return null

                return (
                  <Card 
                    key={option.planId}
                    className={option.recommended ? 'ring-2 ring-blue-500' : ''}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <CardDescription>
                            {plan.price.toLocaleString('hu-HU')} {plan.currency === 'EUR' ? '€' : 'Ft'}/hó
                          </CardDescription>
                        </div>
                        {option.recommended && (
                          <Badge className="bg-blue-500">Ajánlott</Badge>
                        )}
                        {option.savings && (
                          <Badge variant="secondary">
                            {option.savings} Ft megtakarítás
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="flex items-center gap-1">
                            <Zap className="h-4 w-4 text-green-600" />
                            <span>{plan.limits.modeAllocation.fast === -1 ? '∞' : plan.limits.modeAllocation.fast} Fast</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Scale className="h-4 w-4 text-blue-600" />
                            <span>{plan.limits.modeAllocation.balanced} Balanced</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4 text-orange-600" />
                            <span>{plan.limits.modeAllocation.precision} Precision</span>
                          </div>
                        </div>
                        
                        {option.benefits.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-sm font-medium mb-1">Előnyök:</p>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {option.benefits.map((benefit, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <Check className="h-3 w-3 text-green-600 mt-0.5" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {step === 'selection' && (
            <div className="space-y-6">
              <RadioGroup value={selectedPlan || ''} onValueChange={setSelectedPlan}>
                {migrationOptions.map((option) => {
                  const plan = SUBSCRIPTION_PLANS[option.planId]
                  if (!plan) return null

                  return (
                    <div key={option.planId} className="relative">
                      <RadioGroupItem
                        value={option.planId}
                        id={option.planId}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={option.planId}
                        className="flex items-center justify-between rounded-lg border-2 border-gray-200 p-4 hover:bg-gray-50 peer-data-[state=checked]:border-blue-500 peer-data-[state=checked]:bg-blue-50 cursor-pointer"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">{plan.name}</p>
                          <p className="text-sm text-gray-600">
                            {plan.price.toLocaleString('hu-HU')} {plan.currency === 'EUR' ? '€' : 'Ft'}/hó
                          </p>
                        </div>
                        {option.recommended && (
                          <Badge className="ml-3">Ajánlott</Badge>
                        )}
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium">Szeretné megtartani jelenlegi csomagját?</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Lehetősége van megmaradni a jelenlegi árazásnál, de nem férhet hozzá az új funkciókhoz.
                    </p>
                    <div className="flex items-center space-x-2 mt-3">
                      <Checkbox 
                        id="grandfather"
                        checked={wantsGrandfathering}
                        onCheckedChange={(checked) => setWantsGrandfathering(checked as boolean)}
                      />
                      <Label htmlFor="grandfather" className="text-sm cursor-pointer">
                        Szeretnék maradni a jelenlegi csomagomnál
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'benefits' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Gift className="h-8 w-8 text-blue-600" />
                  <h3 className="text-lg font-semibold">Korai átállási kedvezmények</h3>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Badge className="mt-0.5">10%</Badge>
                    <div>
                      <p className="font-medium">10% kedvezmény 3 hónapig</p>
                      <p className="text-sm text-gray-600">Minden új csomagra érvényes</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge className="mt-0.5">+20%</Badge>
                    <div>
                      <p className="font-medium">20% extra perc az első hónapban</p>
                      <p className="text-sm text-gray-600">Minden módban felhasználható</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <Badge className="mt-0.5">VIP</Badge>
                    <div>
                      <p className="font-medium">Elsőbbségi support 6 hónapig</p>
                      <p className="text-sm text-gray-600">Dedikált support csatorna</p>
                    </div>
                  </li>
                </ul>
              </div>

              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  Az új rendszerrel átlagosan 15-20%-kal több értéket kap ugyanazért az árért!
                </AlertDescription>
              </Alert>
            </div>
          )}

          {step === 'confirmation' && selectedPlan && !wantsGrandfathering && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-semibold mb-4">Választott csomag</h3>
                <div className="space-y-2">
                  <p className="text-lg font-medium">{SUBSCRIPTION_PLANS[selectedPlan]?.name}</p>
                  <p className="text-2xl font-bold">
                    {SUBSCRIPTION_PLANS[selectedPlan]?.price.toLocaleString('hu-HU')} Ft/hó
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Feltételek elfogadása</h4>
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm cursor-pointer">
                    Elfogadom az új szolgáltatási feltételeket és tudomásul veszem, hogy az új árazási rendszer szerint leszek számlázva.
                  </Label>
                </div>
              </div>
            </div>
          )}

          {step === 'confirmation' && wantsGrandfathering && (
            <div className="space-y-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Úgy döntött, hogy megtartja jelenlegi csomagját. Továbbra is a régi feltételek szerint használhatja a szolgáltatást, de nem férhet hozzá az új funkciókhoz.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox 
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm cursor-pointer">
                    Megértettem, hogy lemondok az új funkciókról és kedvezményekről.
                  </Label>
                </div>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Sikeres migráció!</h3>
              <p className="text-gray-600">
                {wantsGrandfathering 
                  ? 'Továbbra is a jelenlegi csomagját használja.'
                  : 'Az új csomag azonnal aktív.'}
              </p>
              <p className="text-sm text-gray-500 mt-4">
                Átirányítás a vezérlőpultra...
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {step !== 'intro' && step !== 'complete' && (
            <Button
              variant="outline"
              onClick={() => {
                const steps = Object.keys(steps) as Step[]
                const currentIndex = steps.indexOf(step)
                if (currentIndex > 0) {
                  setStep(steps[currentIndex - 1])
                }
              }}
              disabled={loading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Vissza
            </Button>
          )}

          {step === 'intro' && (
            <Button
              className="ml-auto"
              onClick={() => setStep('analysis')}
            >
              Kezdjük el
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {step === 'analysis' && !loading && usageAnalysis && (
            <Button
              className="ml-auto"
              onClick={() => setStep('comparison')}
            >
              Tovább
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {step === 'comparison' && (
            <Button
              className="ml-auto"
              onClick={() => setStep('selection')}
            >
              Csomag kiválasztása
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {step === 'selection' && (selectedPlan || wantsGrandfathering) && (
            <Button
              className="ml-auto"
              onClick={() => setStep(wantsGrandfathering ? 'confirmation' : 'benefits')}
            >
              Tovább
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {step === 'benefits' && (
            <Button
              className="ml-auto"
              onClick={() => setStep('confirmation')}
            >
              Tovább
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}

          {step === 'confirmation' && acceptTerms && (
            <Button
              className="ml-auto"
              onClick={handleMigration}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Migráció...
                </>
              ) : wantsGrandfathering ? (
                'Megerősítés'
              ) : (
                'Átállás az új csomagra'
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}