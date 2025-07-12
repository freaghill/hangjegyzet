'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthPage() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'SIGNED_IN') {
        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white p-4">
      <Card className="w-full max-w-md glass-effect p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">HangJegyzet.AI</h1>
          <p className="text-gray-600 mt-2">AI Meeting Jegyzetelés Magyar Vállalkozásoknak</p>
        </div>
        
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#2563eb',
                  brandAccent: '#1d4ed8',
                  brandButtonText: 'white',
                  defaultButtonBackground: 'white',
                  defaultButtonBackgroundHover: '#f9fafb',
                  defaultButtonBorder: '#e5e7eb',
                  defaultButtonText: '#374151',
                  dividerBackground: '#e5e7eb',
                  inputBackground: 'white',
                  inputBorder: '#e5e7eb',
                  inputBorderHover: '#d1d5db',
                  inputBorderFocus: '#2563eb',
                  inputText: '#1f2937',
                  inputLabelText: '#374151',
                  inputPlaceholder: '#9ca3af',
                  messageText: '#ef4444',
                  messageBackground: '#fee2e2',
                  anchorTextColor: '#2563eb',
                  anchorTextHoverColor: '#1d4ed8',
                },
                space: {
                  spaceSmall: '4px',
                  spaceMedium: '8px',
                  spaceLarge: '16px',
                  labelBottomMargin: '8px',
                  anchorBottomMargin: '4px',
                  emailInputSpacing: '4px',
                  socialAuthSpacing: '4px',
                  buttonPadding: '12px 16px',
                  inputPadding: '12px 16px',
                },
                fontSizes: {
                  baseBodySize: '14px',
                  baseInputSize: '14px',
                  baseLabelSize: '14px',
                  baseButtonSize: '14px',
                },
                fonts: {
                  bodyFontFamily: 'Inter, sans-serif',
                  buttonFontFamily: 'Inter, sans-serif',
                  inputFontFamily: 'Inter, sans-serif',
                  labelFontFamily: 'Inter, sans-serif',
                },
                borderWidths: {
                  buttonBorderWidth: '1px',
                  inputBorderWidth: '1px',
                },
                radii: {
                  borderRadiusButton: '8px',
                  buttonBorderRadius: '8px',
                  inputBorderRadius: '8px',
                },
              },
            },
            className: {
              container: 'space-y-4',
              label: 'text-gray-700 font-medium',
              button: 'font-medium transition-all',
              input: 'transition-all',
            },
          }}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Email cím',
                password_label: 'Jelszó',
                button_label: 'Bejelentkezés',
                loading_button_label: 'Bejelentkezés...',
                link_text: 'Már van fiókja? Jelentkezzen be',
              },
              sign_up: {
                email_label: 'Email cím',
                password_label: 'Jelszó',
                button_label: 'Regisztráció',
                loading_button_label: 'Regisztráció...',
                link_text: 'Még nincs fiókja? Regisztráljon',
              },
              forgotten_password: {
                email_label: 'Email cím',
                button_label: 'Jelszó visszaállítása',
                loading_button_label: 'Küldés...',
                link_text: 'Elfelejtette jelszavát?',
              },
            },
          }}
          providers={[]}
          redirectTo={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
        />
      </Card>
    </div>
  )
}