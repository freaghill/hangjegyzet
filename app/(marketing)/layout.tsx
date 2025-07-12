import { CookieConsent } from '@/components/privacy/cookie-consent'
import { Toaster } from 'sonner'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <CookieConsent />
      <Toaster position="top-center" richColors />
    </>
  )
}