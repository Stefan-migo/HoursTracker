import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { invite_token, password } = body

    if (!invite_token || !password) {
      return NextResponse.json({ error: 'Token y contraseña son requeridos' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    // Decode the invite token
    let userId: string
    let email: string
    
    try {
      const decoded = Buffer.from(invite_token, 'base64url').toString('utf-8')
      const parts = decoded.split(':')
      
      if (parts.length < 3) {
        return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
      }
      
      userId = parts[0]
      email = parts[1]
    } catch {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
    }

    // Update the user's password using admin client (no session required)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Sign in the user automatically
    const supabase = await createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      // Password was set, but auto sign-in failed - user can log in manually
      return NextResponse.json({
        success: true,
        auto_login: false,
        message: 'Contraseña configurada. Ahora puedes iniciar sesión.',
      })
    }

    // Get the session token to return
    const sessionToken = data.session.access_token

    return NextResponse.json({
      success: true,
      auto_login: true,
      access_token: sessionToken,
      message: 'Contraseña configurada. Iniciando sesión...',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}
