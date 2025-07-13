'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Check, X, Zap, Users, HardDrive, Clock, Headphones, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUBSCRIPTION_PLANS, type SubscriptionPlanDetails } from '@/lib/payments/subscription-plans'
import { useRouter } from 'next/navigation'

interface PricingCardsProps {
  currentPlan?: string
  onSelectPlan?: (planId: string) => void
  showTrial?: boolean
  className?: string
}

export function PricingCards({ 
  currentPlan, 
  onSelectPlan,
  showTrial = true,
  className 
}: PricingCardsProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const router = useRouter()

  const plans = Object.values(SUBSCRIPTION_PLANS).filter(plan => 
    showTrial || plan.id !== 'trial'
  )

  const handleSelectPlan = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId)
    } else {
      router.push(`/checkout?plan=${planId}`)
    }
  }

  const formatPrice = (plan: SubscriptionPlanDetails) => {
    if (plan.price === 0) return 'Ingyenes'
    
    const price = billingPeriod === 'yearly' 
      ? Math.floor(plan.price * 12 * 0.8) // 20% discount for yearly
      : plan.price

    if (plan.currency === 'HUF') {
      return new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price)
    } else {
      return new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: plan.currency,
      }).format(price)
    }
  }

  const getFeatureIcon = (feature: string) => {
    if (feature.includes('perc')) return <Clock className="h-4 w-4" />
    if (feature.includes('felhasználó')) return <Users className="h-4 w-4" />
    if (feature.includes('tárolás')) return <HardDrive className="h-4 w-4" />
    if (feature.includes('támogatás')) return <Headphones className="h-4 w-4" />
    if (feature.includes('Precision')) return <Shield className="h-4 w-4" />
    return <Zap className="h-4 w-4" />
  }

  return (
    <div className={cn("space-y-8", className)}>
      {/* Billing period toggle */}
      <div className="flex items-center justify-center space-x-4">
        <Label htmlFor="billing-period" className="text-base">Havi</Label>
        <Switch
          id="billing-period"
          checked={billingPeriod === 'yearly'}
          onCheckedChange={(checked) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
        />
        <Label htmlFor="billing-period" className="text-base">
          Éves
          <Badge variant="secondary" className="ml-2">20% kedvezmény</Badge>
        </Label>
      </div>

      {/* Pricing cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative transition-all",
              plan.popular && "ring-2 ring-primary shadow-lg scale-105",
              currentPlan === plan.id && "ring-2 ring-green-500"
            )}
          >
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Legnépszerűbb
              </Badge>
            )}
            {currentPlan === plan.id && (
              <Badge variant="secondary" className="absolute -top-3 right-4">
                Jelenlegi csomag
              </Badge>
            )}

            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription className="mt-2">
                <div className="text-3xl font-bold">
                  {formatPrice(plan)}
                </div>
                {plan.price > 0 && (
                  <div className="text-sm text-muted-foreground">
                    / {billingPeriod === 'yearly' ? 'év' : 'hó'}
                  </div>
                )}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Mode allocation */}
              <div className="space-y-2 pb-4 border-b">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fast mód</span>
                  <span className="font-medium">
                    {plan.limits.modeAllocation.fast === -1 
                      ? 'Korlátlan' 
                      : `${plan.limits.modeAllocation.fast} perc`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Balanced mód</span>
                  <span className="font-medium">
                    {plan.limits.modeAllocation.balanced === -1 
                      ? 'Korlátlan' 
                      : `${plan.limits.modeAllocation.balanced} perc`}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Precision mód</span>
                  <span className="font-medium">
                    {plan.limits.modeAllocation.precision === -1 
                      ? 'Korlátlan' 
                      : plan.limits.modeAllocation.precision === 0
                      ? '–'
                      : `${plan.limits.modeAllocation.precision} perc`}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <div className="mt-0.5">
                      {getFeatureIcon(feature)}
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Limitations for lower tiers */}
              {plan.id === 'trial' && (
                <div className="pt-2 space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center">
                    <X className="h-3 w-3 mr-1" />
                    Precision mód nem elérhető
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <X className="h-3 w-3 mr-1" />
                    Maximum {plan.limits.maxMeetingDuration} perces meetingek
                  </p>
                </div>
              )}
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={currentPlan === plan.id ? "secondary" : "default"}
                disabled={currentPlan === plan.id}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {currentPlan === plan.id 
                  ? 'Jelenlegi csomag'
                  : plan.id === 'trial' 
                  ? 'Próbaidő indítása'
                  : 'Választás'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Additional info */}
      <div className="text-center space-y-2 text-sm text-muted-foreground">
        <p>Minden csomag tartalmazza: SSL titkosítás, GDPR megfelelőség, automatikus mentések</p>
        <p>Az árak ÁFA-t nem tartalmaznak (alanyi adómentes)</p>
        {billingPeriod === 'yearly' && (
          <p className="text-green-600 font-medium">
            Éves fizetéssel 2 hónap ingyen!
          </p>
        )}
      </div>
    </div>
  )
}