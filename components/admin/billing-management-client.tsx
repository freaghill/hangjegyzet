'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Receipt, 
  CreditCard, 
  AlertCircle,
  Download,
  Eye,
  TrendingUp,
  Clock
} from 'lucide-react'
import { format } from 'date-fns'

interface Invoice {
  id: string
  invoice_number: string
  issue_date: string
  due_date: string
  gross_amount: number
  status: string
  organizations?: {
    name: string
    subscription_tier: string
  }
}

interface Payment {
  id: string
  amount: number
  status: string
  payment_method: string
  transaction_id: string
  created_at: string
  organizations?: {
    name: string
  }
  invoices?: {
    invoice_number: string
  }
}

interface Intent {
  id: string
  order_ref: string
  plan: string
  amount: number
  status: string
  created_at: string
  organizations?: {
    name: string
  }
}

interface BillingManagementClientProps {
  invoices: Invoice[]
  payments: Payment[]
  pendingIntents: Intent[]
  monthlyRevenue: number
}

export default function BillingManagementClient({
  invoices,
  payments,
  pendingIntents,
  monthlyRevenue
}: BillingManagementClientProps) {
  const [activeTab, setActiveTab] = useState('invoices')

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div>
      {/* Revenue Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(monthlyRevenue)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {pendingIntents.length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {invoices.length}
              </p>
            </div>
            <Receipt className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="intents">Pending Intents</TabsTrigger>
        </TabsList>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-gray-900">Invoice #</th>
                    <th className="text-left p-4 font-medium text-gray-900">Organization</th>
                    <th className="text-left p-4 font-medium text-gray-900">Amount</th>
                    <th className="text-left p-4 font-medium text-gray-900">Issue Date</th>
                    <th className="text-left p-4 font-medium text-gray-900">Due Date</th>
                    <th className="text-left p-4 font-medium text-gray-900">Status</th>
                    <th className="text-left p-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{invoice.invoice_number}</td>
                      <td className="p-4">{invoice.organizations?.name || 'Unknown'}</td>
                      <td className="p-4 font-medium">{formatCurrency(invoice.gross_amount)}</td>
                      <td className="p-4">{format(new Date(invoice.issue_date), 'MMM d, yyyy')}</td>
                      <td className="p-4">{format(new Date(invoice.due_date), 'MMM d, yyyy')}</td>
                      <td className="p-4">
                        <Badge className={getStatusBadgeColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-gray-900">Transaction ID</th>
                    <th className="text-left p-4 font-medium text-gray-900">Organization</th>
                    <th className="text-left p-4 font-medium text-gray-900">Invoice</th>
                    <th className="text-left p-4 font-medium text-gray-900">Amount</th>
                    <th className="text-left p-4 font-medium text-gray-900">Method</th>
                    <th className="text-left p-4 font-medium text-gray-900">Date</th>
                    <th className="text-left p-4 font-medium text-gray-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-mono text-sm">{payment.transaction_id || 'N/A'}</td>
                      <td className="p-4">{payment.organizations?.name || 'Unknown'}</td>
                      <td className="p-4">{payment.invoices?.invoice_number || 'N/A'}</td>
                      <td className="p-4 font-medium">{formatCurrency(payment.amount)}</td>
                      <td className="p-4">{payment.payment_method || 'Card'}</td>
                      <td className="p-4">{format(new Date(payment.created_at), 'MMM d, yyyy')}</td>
                      <td className="p-4">
                        <Badge className={getStatusBadgeColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Pending Intents Tab */}
        <TabsContent value="intents">
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-gray-900">Order Ref</th>
                    <th className="text-left p-4 font-medium text-gray-900">Organization</th>
                    <th className="text-left p-4 font-medium text-gray-900">Plan</th>
                    <th className="text-left p-4 font-medium text-gray-900">Amount</th>
                    <th className="text-left p-4 font-medium text-gray-900">Created</th>
                    <th className="text-left p-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingIntents.map((intent) => (
                    <tr key={intent.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-mono text-sm">{intent.order_ref}</td>
                      <td className="p-4">{intent.organizations?.name || 'Unknown'}</td>
                      <td className="p-4">
                        <Badge>{intent.plan}</Badge>
                      </td>
                      <td className="p-4 font-medium">{formatCurrency(intent.amount)}</td>
                      <td className="p-4">{format(new Date(intent.created_at), 'MMM d, yyyy HH:mm')}</td>
                      <td className="p-4">
                        <Button size="sm" variant="outline">
                          <AlertCircle className="w-4 h-4 mr-1" />
                          Check Status
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {pendingIntents.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No pending payment intents
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}