import { Toaster } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { Logo } from '@/components/ui/logo'
import { UploadDialog } from '@/components/meetings/upload-dialog'
import { Upload } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="border-b bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard">
                {/* Responsive logo */}
        <div className="block lg:hidden">
          <Logo variant="compact" />
        </div>
        <div className="hidden lg:block">
          <Logo variant="full" size="md" />
        </div>
              </Link>
              <div className="hidden md:flex space-x-6">
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  Meetingek
                </Link>
                <Link href="/dashboard/analytics" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  Analitika
                </Link>
                <Link href="/dashboard/settings" className="text-gray-600 hover:text-gray-900 px-3 py-2 text-sm font-medium">
                  Beállítások
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <UploadDialog>
                <Button variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  Új meeting
                </Button>
              </UploadDialog>
              <Button variant="ghost" size="sm">
                Profil
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <Toaster position="top-center" richColors />
      <InstallPrompt />
    </div>
  )
}