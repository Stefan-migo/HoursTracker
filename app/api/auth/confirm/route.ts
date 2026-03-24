import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  if (!token || !email) {
    return NextResponse.redirect(new URL('/login?error=invalid_confirmation', request.url))
  }

  try {
    const supabase = await createClient()

    // Verify the user with the confirmation token
    const { data, error } = await supabase.auth.verifyOtp({
      type: 'email_change',
      email: email,
      token: token,
    })

    if (error) {
      console.error('Verification error:', error)
      return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url))
    }

    // If verification successful, redirect to login with success message
    return NextResponse.redirect(new URL('/login?confirmed=true', request.url))
  } catch (error) {
    console.error('Error verifying user:', error)
    return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url))
  }
}

export async function POST(request: Request) {
  try {
    const { email, token } = await request.json()

    if (!email || !token) {
      return NextResponse.json(
        { error: 'Email and token are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify the OTP token
    const { data, error } = await supabase.auth.verifyOtp({
      type: 'email_change',
      email: email,
      token: token,
    })

    if (error) {
      console.error('OTP verification error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, user: data.user })
  } catch (error) {
    console.error('Error in confirm:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
