'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useOrganization } from '@/hooks/useOrganization'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { toast } from 'sonner'
import { CreditCard, FileText, History } from 'lucide-react'

interface Invoice {
  id: string
  number: string
  created_at: string
  amount: number
  status: 'paid' | 'pending'
}

export default function BillingSettings() {
  const { organization, isLoading: orgLoading } = useOrganization()
  const [billingHistory, setBillingHistory] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadBillingHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/billing/history')
      if (!response.ok) throw new Error('Failed to load billing history')
      
      const data = await response.json()
      setBillingHistory(data.invoices || [])
    } catch (error) {
      console.error('Error loading billing history:', error)
      toast.error('Nem sikerült betölteni a számlázási előzményeket')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (organization) {
      loadBillingHistory()
    }
  }, [organization, loadBillingHistory])

  async function handleManageSubscription() {
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })
      
      if (!response.ok) throw new Error('Failed to create portal session')
      
      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error opening billing portal:', error)
      toast.error('Nem sikerült megnyitni a számlázási portált')
    }
  }

  if (orgLoading || loading) {
    return <div>Betöltés...</div>
  }

  const subscriptionTiers = {
    trial: { name: 'Próba', color: 'bg-gray-500' },
    starter: { name: 'Kezdő', color: 'bg-blue-500' },
    professional: { name: 'Profi', color: 'bg-purple-500' },
    enterprise: { name: 'Vállalati', color: 'bg-orange-500' },
  }

  const currentTier = subscriptionTiers[organization?.subscription_tier as keyof typeof subscriptionTiers] || subscriptionTiers.trial

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Jelenlegi előfizetés</CardTitle>
          <CardDescription>Az Ön szervezetének előfizetési adatai</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Csomag</p>
              <div className="flex items-center gap-2">
                <Badge className={currentTier.color}>{currentTier.name}</Badge>
                {organization?.subscription_status === 'active' && (
                  <Badge variant="outline" className="text-green-600">Aktív</Badge>
                )}
              </div>
            </div>
            
            {organization?.stripe_customer_id && (
              <Button onClick={handleManageSubscription}>
                <CreditCard className="mr-2 h-4 w-4" />
                Előfizetés kezelése
              </Button>
            )}
          </div>

          {organization?.subscription_cancelled_at && (
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                Az előfizetés lemondásra került. Érvényes: {' '}
                {format(new Date(organization.subscription_cancelled_at), 'yyyy. MMMM dd.', { locale: hu })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Számlázási előzmények</CardTitle>
          <CardDescription>Korábbi számlák és fizetések</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="invoices" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invoices">
                <FileText className="mr-2 h-4 w-4" />
                Számlák
              </TabsTrigger>
              <TabsTrigger value="payments">
                <History className="mr-2 h-4 w-4" />
                Fizetések
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="invoices" className="space-y-2">
              {billingHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  Még nincsenek számlák
                </p>
              ) : (
                billingHistory.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{invoice.number}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(invoice.created_at), 'yyyy. MMMM dd.', { locale: hu })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{invoice.amount} Ft</span>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                        {invoice.status === 'paid' ? 'Fizetve' : 'Függőben'}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="payments" className="space-y-2">
              <p className="text-sm text-gray-500 text-center py-4">
                A fizetési előzmények betöltése folyamatban...
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}