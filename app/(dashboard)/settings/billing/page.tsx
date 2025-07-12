'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/lib/payments/subscription'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const billingSchema = z.object({
  name: z.string().min(2, 'Név kötelező'),
  company: z.string().optional(),
  taxNumber: z.string().optional(),
  address: z.string().min(5, 'Cím kötelező'),
  city: z.string().min(2, 'Város kötelező'),
  zip: z.string().min(4, 'Irányítószám kötelező'),
})

type BillingFormData = z.infer<typeof billingSchema>

export default function BillingPage() {
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>('trial')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [showBillingForm, setShowBillingForm] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BillingFormData>({
    resolver: zodResolver(billingSchema),
  })

  useEffect(() => {
    loadCurrentPlan()
    
    // Check for payment result messages
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      toast.success('Sikeres fizetés! Az előfizetése aktiválva lett.')
      // Clean URL
      window.history.replaceState({}, '', '/settings/billing')
    } else if (params.get('cancelled') === 'true') {
      toast.info('A fizetési folyamat megszakítva.')
      window.history.replaceState({}, '', '/settings/billing')
    } else if (params.has('error')) {
      const error = params.get('error')
      const errorMessages: Record<string, string> = {
        payment_failed: 'A fizetés sikertelen volt. Kérjük próbálja újra.',
        payment_timeout: 'A fizetési folyamat időtúllépés miatt megszakadt.',
        invalid_signature: 'Érvénytelen fizetési válasz.',
        missing_params: 'Hiányzó paraméterek a fizetési válaszban.',
        processing_error: 'Hiba történt a fizetés feldolgozása során.',
      }
      toast.error(errorMessages[error || ''] || 'Ismeretlen hiba történt.')
      window.history.replaceState({}, '', '/settings/billing')
    }
  }, [])

  const loadCurrentPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      const { data: org } = await supabase
        .from('organizations')
        .select('subscription_tier')
        .eq('id', profile.organization_id)
        .single()

      if (org) {
        setCurrentPlan(org.subscription_tier as SubscriptionPlan)
      }
    } catch (error) {
      console.error('Error loading plan:', error)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const onSelectPlan = (plan: SubscriptionPlan) => {
    if (plan === 'trial' || plan === currentPlan) return
    setSelectedPlan(plan)
    setShowBillingForm(true)
  }

  const onSubmitBilling = async (data: BillingFormData) => {
    if (!selectedPlan) return
    
    setIsLoading(true)
    try {
      const response = await fetch('/api/subscriptions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          billingData: data,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Előfizetés létrehozása sikertelen')
      }

      // Redirect to SimplePay
      if (result.paymentUrl) {
        window.location.href = result.paymentUrl
      }
    } catch (error) {
      console.error('Subscription error:', error)
      toast.error(error instanceof Error ? error.message : 'Hiba történt')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Számlázás és előfizetés</h1>
        <p className="text-gray-600 mt-2">
          Kezelje előfizetését és számlázási adatait
        </p>
      </div>

      {/* Current Plan */}
      <Card className="glass-effect">
        <CardHeader>
          <CardTitle>Jelenlegi csomag</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">
                {SUBSCRIPTION_PLANS[currentPlan].name}
              </h3>
              <p className="text-gray-600 mt-1">
                {currentPlan === 'trial' 
                  ? 'Próbaidőszak - 14 nap'
                  : formatPrice(SUBSCRIPTION_PLANS[currentPlan].price) + '/hó'}
              </p>
            </div>
            <Badge variant={currentPlan === 'trial' ? 'secondary' : 'default'}>
              Aktív
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => {
          if (key === 'trial') return null
          const planKey = key as SubscriptionPlan
          const isCurrent = planKey === currentPlan
          
          return (
            <Card 
              key={key} 
              className={`glass-effect ${planKey === 'professional' ? 'ring-2 ring-blue-600' : ''}`}
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                {planKey === 'professional' && (
                  <Badge className="w-fit">Legnépszerűbb</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">
                    {formatPrice(plan.price)}
                  </p>
                  <p className="text-sm text-gray-600">/hónap</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Alanyi adómentes - ÁFA tv. 193. §
                  </p>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent || planKey < currentPlan}
                  onClick={() => onSelectPlan(planKey)}
                >
                  {isCurrent ? 'Jelenlegi csomag' : 
                   planKey < currentPlan ? 'Nem elérhető' : 'Választás'}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Billing Form Modal */}
      {showBillingForm && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Számlázási adatok</CardTitle>
              <CardDescription>
                {SUBSCRIPTION_PLANS[selectedPlan].name} csomag - {formatPrice(SUBSCRIPTION_PLANS[selectedPlan].price)}/hó
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmitBilling)}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Név *</Label>
                  <Input
                    id="name"
                    {...register('name')}
                    disabled={isLoading}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="company">Cégnév (opcionális)</Label>
                  <Input
                    id="company"
                    {...register('company')}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="taxNumber">Adószám (opcionális)</Label>
                  <Input
                    id="taxNumber"
                    placeholder="12345678-1-23"
                    {...register('taxNumber')}
                    disabled={isLoading}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Cím *</Label>
                  <Input
                    id="address"
                    {...register('address')}
                    disabled={isLoading}
                  />
                  {errors.address && (
                    <p className="text-sm text-red-500">{errors.address.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip">Irányítószám *</Label>
                    <Input
                      id="zip"
                      {...register('zip')}
                      disabled={isLoading}
                    />
                    {errors.zip && (
                      <p className="text-sm text-red-500">{errors.zip.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">Város *</Label>
                    <Input
                      id="city"
                      {...register('city')}
                      disabled={isLoading}
                    />
                    {errors.city && (
                      <p className="text-sm text-red-500">{errors.city.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBillingForm(false)}
                  disabled={isLoading}
                >
                  Mégse
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Feldolgozás...
                    </>
                  ) : (
                    'Tovább a fizetéshez'
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}