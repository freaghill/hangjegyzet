'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const registerSchema = z.object({
  name: z.string().min(2, 'A név legalább 2 karakter hosszú kell legyen'),
  email: z.string().email('Érvénytelen email cím'),
  password: z.string().min(6, 'A jelszó legalább 6 karakter hosszú kell legyen'),
  companyName: z.string().min(2, 'A cégnév legalább 2 karakter hosszú kell legyen'),
})

type RegisterFormData = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.name,
            company_name: data.companyName,
          },
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      toast.success('Sikeres regisztráció! Kérjük, erősítse meg email címét.')
      router.push('/login')
    } catch (_error) {
      toast.error('Hiba történt a regisztráció során')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
      <Card className="w-full max-w-md glass-effect">
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">
              Regisztráció
            </CardTitle>
            <CardDescription className="text-center">
              14 napos ingyenes próbaidőszak, bankkártya nélkül
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Teljes név</Label>
              <Input
                id="name"
                type="text"
                placeholder="Példa János"
                {...register('name')}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Cégnév</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Példa Kft."
                {...register('companyName')}
                disabled={isLoading}
              />
              {errors.companyName && (
                <p className="text-sm text-red-500">{errors.companyName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email cím</Label>
              <Input
                id="email"
                type="email"
                placeholder="pelda@email.hu"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Jelszó</Label>
              <Input
                id="password"
                type="password"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Regisztráció...' : 'Ingyenes próba kezdése'}
            </Button>
            <p className="text-xs text-center text-gray-600">
              A regisztrációval elfogadja az{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Általános Szerződési Feltételeket
              </Link>{' '}
              és az{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Adatvédelmi Nyilatkozatot
              </Link>
            </p>
            <div className="text-center text-sm">
              Már van fiókja?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">
                Jelentkezzen be
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}