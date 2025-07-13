'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  CreditCard, 
  Plus, 
  Trash2, 
  Star,
  AlertCircle,
  Building,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'

interface PaymentMethod {
  id: string
  type: 'card' | 'bank_transfer' | 'barion_wallet' | 'simplepay_card'
  provider: 'simplepay' | 'barion'
  last4?: string
  expiryMonth?: number
  expiryYear?: number
  cardBrand?: string
  bankName?: string
  isDefault: boolean
  createdAt: Date
}

interface PaymentMethodsProps {
  organizationId: string
  onMethodAdded?: () => void
  onMethodRemoved?: () => void
}

export function PaymentMethods({ 
  organizationId, 
  onMethodAdded,
  onMethodRemoved 
}: PaymentMethodsProps) {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addingMethod, setAddingMethod] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadPaymentMethods()
  }, [organizationId])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/organizations/${organizationId}/payment-methods`)
      if (!response.ok) throw new Error('Failed to load payment methods')
      
      const data = await response.json()
      setMethods(data.methods)
    } catch (error) {
      console.error('Failed to load payment methods:', error)
      toast({
        title: 'Hiba',
        description: 'Nem sikerült betölteni a fizetési módokat',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddCard = async (provider: 'simplepay' | 'barion') => {
    try {
      setAddingMethod(true)
      
      // Initialize card registration
      const response = await fetch(`/api/organizations/${organizationId}/payment-methods/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      })
      
      if (!response.ok) throw new Error('Failed to initialize card registration')
      
      const { paymentUrl } = await response.json()
      
      // Redirect to provider's registration page
      window.location.href = paymentUrl
    } catch (error) {
      console.error('Failed to add card:', error)
      toast({
        title: 'Hiba',
        description: 'Nem sikerült elindítani a kártya regisztrációt',
        variant: 'destructive'
      })
    } finally {
      setAddingMethod(false)
    }
  }

  const handleSetDefault = async (methodId: string) => {
    try {
      const response = await fetch(
        `/api/organizations/${organizationId}/payment-methods/${methodId}/set-default`,
        { method: 'POST' }
      )
      
      if (!response.ok) throw new Error('Failed to set default')
      
      toast({
        title: 'Alapértelmezett fizetési mód beállítva',
      })
      
      await loadPaymentMethods()
    } catch (error) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült beállítani az alapértelmezett fizetési módot',
        variant: 'destructive'
      })
    }
  }

  const handleRemove = async (methodId: string) => {
    if (!confirm('Biztosan törölni szeretné ezt a fizetési módot?')) {
      return
    }

    try {
      setDeletingId(methodId)
      const response = await fetch(
        `/api/organizations/${organizationId}/payment-methods/${methodId}`,
        { method: 'DELETE' }
      )
      
      if (!response.ok) throw new Error('Failed to remove')
      
      toast({
        title: 'Fizetési mód törölve',
      })
      
      await loadPaymentMethods()
      onMethodRemoved?.()
    } catch (error) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült törölni a fizetési módot',
        variant: 'destructive'
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getMethodIcon = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
      case 'simplepay_card':
        return <CreditCard className="h-5 w-5" />
      case 'bank_transfer':
        return <Building className="h-5 w-5" />
      case 'barion_wallet':
        return <CreditCard className="h-5 w-5 text-green-600" />
      default:
        return <CreditCard className="h-5 w-5" />
    }
  }

  const getMethodName = (method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
      case 'simplepay_card':
        return `${method.cardBrand || 'Kártya'} •••• ${method.last4}`
      case 'bank_transfer':
        return `${method.bankName || 'Bank'} átutalás`
      case 'barion_wallet':
        return 'Barion tárca'
      default:
        return 'Fizetési mód'
    }
  }

  const getProviderBadge = (provider: string) => {
    switch (provider) {
      case 'simplepay':
        return <Badge variant="secondary" className="text-xs">SimplePay</Badge>
      case 'barion':
        return <Badge variant="secondary" className="text-xs bg-green-100">Barion</Badge>
      default:
        return null
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fizetési módok</CardTitle>
              <CardDescription>
                Kezelje a szervezet fizetési módjait
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Új hozzáadása
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {methods.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Még nincs fizetési mód hozzáadva. Adjon hozzá egyet az előfizetések kezeléséhez.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    method.isDefault && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-center space-x-4">
                    {getMethodIcon(method)}
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{getMethodName(method)}</p>
                        {getProviderBadge(method.provider)}
                      </div>
                      {method.expiryMonth && method.expiryYear && (
                        <p className="text-sm text-muted-foreground">
                          Lejár: {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                        </p>
                      )}
                      {method.isDefault && (
                        <div className="flex items-center space-x-1 text-xs text-primary mt-1">
                          <Star className="h-3 w-3 fill-primary" />
                          <span>Alapértelmezett</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {!method.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(method.id)}
                      >
                        Alapértelmezett
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(method.id)}
                      disabled={deletingId === method.id || (method.isDefault && methods.length === 1)}
                    >
                      {deletingId === method.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add payment method dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Új fizetési mód hozzáadása</DialogTitle>
            <DialogDescription>
              Válasszon fizetési szolgáltatót a kártya regisztrációhoz
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleAddCard('simplepay')}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium">SimplePay</p>
                    <p className="text-sm text-muted-foreground">
                      Magyar bankkártyák, gyors fizetés
                    </p>
                  </div>
                </div>
                <Badge>Ajánlott</Badge>
              </CardContent>
            </Card>
            
            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => handleAddCard('barion')}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">Barion</p>
                    <p className="text-sm text-muted-foreground">
                      Nemzetközi kártyák, EUR fizetés
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {addingMethod && (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}