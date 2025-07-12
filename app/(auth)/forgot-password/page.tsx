'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo } from '@/components/ui/logo'
import { ArrowLeft, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        toast.error(error.message)
      } else {
        setIsSubmitted(true)
        toast.success('Ellenőrizze az email fiókját!')
      }
    } catch (error) {
      toast.error('Hiba történt. Kérjük próbálja újra.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Logo variant="full" size="lg" className="mx-auto mb-8" />
            <Card>
              <CardHeader>
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Email elküldve!</CardTitle>
                <CardDescription>
                  Küldtünk egy linket a megadott email címre, amellyel új jelszót állíthat be.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  Ha nem kapja meg az emailt néhány percen belül, ellenőrizze a spam mappát.
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={() => {
                      setIsSubmitted(false)
                      setEmail('')
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    Újraküldés másik címre
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/login">Vissza a bejelentkezéshez</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Logo variant="full" size="lg" className="mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-gray-900">Elfelejtett jelszó</h2>
          <p className="mt-2 text-gray-600">
            Adja meg az email címét és küldünk egy linket az új jelszó beállításához.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Jelszó visszaállítása</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email cím</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="pelda@email.hu"
                  required
                  disabled={isLoading}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || !email}
              >
                {isLoading ? 'Küldés...' : 'Visszaállító link küldése'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="text-sm text-blue-600 hover:text-blue-500 inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Vissza a bejelentkezéshez
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}