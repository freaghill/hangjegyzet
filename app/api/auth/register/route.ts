import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { emailService } from '@/lib/email/sendgrid'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, companyName } = await request.json()
    
    const supabase = await createClient()
    
    // Create user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          company_name: companyName,
        },
      },
    })
    
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }
    
    if (authData.user) {
      // Send welcome email using SendGrid
      try {
        await emailService.sendWelcomeEmail({
          email,
          name,
        })
      } catch (emailError) {
        // Log error but don't fail registration
        console.error('Failed to send welcome email:', emailError)
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Registration successful. Please check your email.'
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}