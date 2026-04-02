import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { invite_token, password, email: bodyEmail } = body

    if (!password) {
      return NextResponse.json({ error: 'La contraseña es requerida' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    let userId: string | null = null
    let userEmail: string | null = null

    // Try to get current session user first
    const supabase = await createClient()
    const { data: { user: sessionUser }, error: getUserError } = await supabase.auth.getUser()

    if (sessionUser) {
      userId = sessionUser.id
      userEmail = sessionUser.email || null
    } else if (invite_token) {
      // Decode invite token to get email
      try {
        const decoded = Buffer.from(invite_token, 'base64url').toString('utf-8')
        const [email, timestamp] = decoded.split(':')
        
        if (email && timestamp) {
          // Find user by email
          const { data: userData, error: findError } = await supabaseAdmin.auth.admin.listUsers()
          
          if (!findError && userData.users) {
            const foundUser = userData.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
            if (foundUser) {
              userId = foundUser.id
              userEmail = foundUser.email || null
            }
          }
        }
      } catch (decodeError) {
        console.error('Error decoding invite token:', decodeError)
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'No se pudo verificar el usuario. El enlace puede haber expirado.' }, { status: 401 })
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabase
      .from('profiles')
      .update({ invitation_status: 'active' })
      .eq('id', userId)

    // Try to sign in
    if (userEmail) {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      })

      if (!signInError && data.session) {
        return NextResponse.json({
          success: true,
          auto_login: true,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          message: 'Contraseña configurada. Iniciando sesión...',
        })
      }
    }

    return NextResponse.json({
      success: true,
      auto_login: false,
      message: 'Contraseña configurada. Ahora puedes iniciar sesión.',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}
