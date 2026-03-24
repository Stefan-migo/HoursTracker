import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const confirmToken = searchParams.get('token')

  if (!confirmToken) {
    return NextResponse.redirect(new URL('/login?error=invalid_confirmation', request.url))
  }

  let userId: string
  let email: string
  
  try {
    const decoded = Buffer.from(confirmToken, 'base64url').toString('utf-8')
    const parts = decoded.split(':')
    
    if (parts.length < 3) {
      return NextResponse.redirect(new URL('/login?error=invalid_confirmation', request.url))
    }
    
    userId = parts[0]
    email = parts[1]
  } catch {
    return NextResponse.redirect(new URL('/login?error=invalid_confirmation', request.url))
  }

  try {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    )

    if (updateError) {
      console.error('Error confirming user:', updateError)
      return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url))
    }

    const supabase = await createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: '', 
    })

    return NextResponse.redirect(new URL('/login?confirmed=true', request.url))
  } catch (error) {
    console.error('Error confirming user:', error)
    return NextResponse.redirect(new URL('/login?error=confirmation_failed', request.url))
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { confirm_token } = body

    if (!confirm_token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    let userId: string
    let email: string
    
    try {
      const decoded = Buffer.from(confirm_token, 'base64url').toString('utf-8')
      const parts = decoded.split(':')
      
      if (parts.length < 3) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
      }
      
      userId = parts[0]
      email = parts[1]
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    )

    if (updateError) {
      console.error('Error confirming user:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta confirmada. Ahora puedes iniciar sesión.',
    })
  } catch (error) {
    console.error('Confirm signup error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}