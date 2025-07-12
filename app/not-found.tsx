import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home, Search, HelpCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200">404</h1>
          <div className="mt-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full">
              <Search className="w-10 h-10 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Error Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Az oldal nem található
        </h2>
        <p className="text-gray-600 mb-8">
          Sajnáljuk, de a keresett oldal nem létezik vagy áthelyezésre került. 
          Kérjük, ellenőrizze a címet vagy térjen vissza a főoldalra.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="default" asChild>
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Főoldal
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link href="/support">
              <HelpCircle className="w-4 h-4 mr-2" />
              Támogatás
            </Link>
          </Button>
        </div>

        {/* Additional Help */}
        <div className="mt-12 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Hasznos linkek:
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/pricing" className="text-blue-600 hover:underline">
              Árazás
            </Link>
            <Link href="/features" className="text-blue-600 hover:underline">
              Funkciók
            </Link>
            <Link href="/docs" className="text-blue-600 hover:underline">
              Dokumentáció
            </Link>
            <Link href="/contact" className="text-blue-600 hover:underline">
              Kapcsolat
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}