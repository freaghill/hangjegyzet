'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  AlertCircle,
  Download,
  RefreshCcw,
  XCircle,
  CheckCircle2,
  Clock,
  Zap,
  Shield
} from 'lucide-react'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { subscriptionManager } from '@/lib/payments/subscription-manager'
import { getSubscriptionPlan } from '@/lib/payments/subscription-plans'
import { useToast } from '@/components/ui/use-toast'

interface SubscriptionDashboardProps {
  subscriptionId: string
  organizationId: string
}

export function SubscriptionDashboard({ 
  subscriptionId, 
  organizationId 
}: SubscriptionDashboardProps) {
  const [subscription, setSubscription] = useState<any>(null)
  const [usage, setUsage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [canceling, setCanceling] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadSubscriptionData()
  }, [subscriptionId])

  const loadSubscriptionData = async () => {
    try {
      setLoading(true)
      const [subData, usageData] = await Promise.all([
        fetch(`/api/subscriptions/${subscriptionId}`).then(r => r.json()),
        subscriptionManager.getSubscriptionUsage(subscriptionId)
      ])
      
      setSubscription(subData)
      setUsage(usageData)
    } catch (error) {
      console.error('Failed to load subscription:', error)
      toast({
        title: 'Hiba',
        description: 'Nem sikerült betölteni az előfizetési adatokat',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Biztosan le szeretné mondani az előfizetést? Az aktuális időszak végéig még használhatja a szolgáltatást.')) {
      return
    }

    try {
      setCanceling(true)
      await fetch(`/api/subscriptions/${subscriptionId}/cancel`, {
        method: 'POST'
      })
      
      toast({
        title: 'Előfizetés lemondva',
        description: 'Az előfizetés az aktuális időszak végén megszűnik',
      })
      
      await loadSubscriptionData()
    } catch (error) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült lemondani az előfizetést',
        variant: 'destructive'
      })
    } finally {
      setCanceling(false)
    }
  }

  const handleReactivate = async () => {
    try {
      await fetch(`/api/subscriptions/${subscriptionId}/reactivate`, {
        method: 'POST'
      })
      
      toast({
        title: 'Előfizetés újraaktiválva',
        description: 'Az előfizetés folytatódik',
      })
      
      await loadSubscriptionData()
    } catch (error) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült újraaktiválni az előfizetést',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!subscription || !usage) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nem található aktív előfizetés
        </AlertDescription>
      </Alert>
    )
  }

  const plan = getSubscriptionPlan(subscription.planId)
  if (!plan) return null

  const getStatusBadge = () => {
    switch (subscription.status) {
      case 'active':
        return <Badge variant="default">Aktív</Badge>
      case 'trialing':
        return <Badge variant="secondary">Próbaidőszak</Badge>
      case 'past_due':
        return <Badge variant="destructive">Lejárt fizetés</Badge>
      case 'canceled':
        return <Badge variant="outline">Lemondva</Badge>
      default:
        return <Badge variant="outline">{subscription.status}</Badge>
    }
  }

  const getModeUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600'
    if (percentage >= 75) return 'text-yellow-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      {/* Subscription overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{plan.name} csomag</CardTitle>
              <CardDescription>
                {format(new Date(subscription.currentPeriodStart), 'yyyy. MMMM d.', { locale: hu })} - 
                {format(new Date(subscription.currentPeriodEnd), 'yyyy. MMMM d.', { locale: hu })}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Következő számlázás</p>
                <p className="font-medium">
                  {subscription.cancelAtPeriodEnd 
                    ? 'Lemondva'
                    : format(new Date(subscription.currentPeriodEnd), 'yyyy. MMMM d.', { locale: hu })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Havi díj</p>
                <p className="font-medium">
                  {new Intl.NumberFormat('hu-HU', {
                    style: 'currency',
                    currency: plan.currency,
                    minimumFractionDigits: 0,
                  }).format(plan.price)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Felhasználás</p>
                <p className="font-medium">
                  {Math.round((usage.usage.fast + usage.usage.balanced + usage.usage.precision) / 
                    (plan.limits.modeAllocation.fast + plan.limits.modeAllocation.balanced + plan.limits.modeAllocation.precision) * 100)}%
                </p>
              </div>
            </div>
          </div>

          {subscription.cancelAtPeriodEnd && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Az előfizetés {format(new Date(subscription.currentPeriodEnd), 'yyyy. MMMM d.', { locale: hu })}-án megszűnik.
                <Button
                  variant="link"
                  className="ml-2 h-auto p-0"
                  onClick={handleReactivate}
                >
                  Újraaktiválás
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Usage details */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Felhasználás</TabsTrigger>
          <TabsTrigger value="invoices">Számlák</TabsTrigger>
          <TabsTrigger value="payment-methods">Fizetési módok</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Havi felhasználás</CardTitle>
              <CardDescription>
                Az aktuális számlázási időszak felhasználási adatai
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Fast mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Fast mód</span>
                  </div>
                  <span className={cn("text-sm font-medium", getModeUsageColor(usage.percentages.fast))}>
                    {usage.usage.fast} / {usage.limits.fast === -1 ? '∞' : usage.limits.fast} perc
                  </span>
                </div>
                {usage.limits.fast !== -1 && (
                  <Progress value={usage.percentages.fast} className="h-2" />
                )}
              </div>

              {/* Balanced mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Balanced mód</span>
                  </div>
                  <span className={cn("text-sm font-medium", getModeUsageColor(usage.percentages.balanced))}>
                    {usage.usage.balanced} / {usage.limits.balanced === -1 ? '∞' : usage.limits.balanced} perc
                  </span>
                </div>
                {usage.limits.balanced !== -1 && (
                  <Progress value={usage.percentages.balanced} className="h-2" />
                )}
              </div>

              {/* Precision mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Precision mód</span>
                  </div>
                  <span className={cn("text-sm font-medium", getModeUsageColor(usage.percentages.precision))}>
                    {usage.usage.precision} / {usage.limits.precision === -1 ? '∞' : usage.limits.precision} perc
                  </span>
                </div>
                {usage.limits.precision !== -1 && usage.limits.precision > 0 && (
                  <Progress value={usage.percentages.precision} className="h-2" />
                )}
                {usage.limits.precision === 0 && (
                  <p className="text-xs text-muted-foreground">Nem elérhető ebben a csomagban</p>
                )}
              </div>

              {/* Usage tips */}
              {Object.values(usage.percentages).some(p => p > 75) && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Közeledik a havi limithez. Fontolja meg a magasabb csomagra váltást.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Számlázási előzmények</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* This would be populated from API */}
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">2024. január</p>
                      <p className="text-sm text-muted-foreground">
                        {plan.name} csomag
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">
                      {new Intl.NumberFormat('hu-HU', {
                        style: 'currency',
                        currency: plan.currency,
                        minimumFractionDigits: 0,
                      }).format(plan.price)}
                    </span>
                    <Button size="sm" variant="ghost">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fizetési módok</CardTitle>
                <Button size="sm">Új hozzáadása</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5" />
                    <div>
                      <p className="font-medium">•••• 4242</p>
                      <p className="text-sm text-muted-foreground">
                        Lejár: 12/25
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Alapértelmezett</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      {subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
        <Card>
          <CardHeader>
            <CardTitle>Előfizetés kezelése</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline">
              Csomag váltása
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={canceling}
            >
              {canceling ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Lemondás...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Előfizetés lemondása
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}