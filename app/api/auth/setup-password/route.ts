import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { invite_token, password } = body

    if (!password) {
      return NextResponse.json({ error: 'La contraseña es requerida' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user }, error: getUserError } = await supabase.auth.getUser()

    if (getUserError || !user) {
      return NextResponse.json({ error: 'No se pudo verificar el usuario' }, { status: 401 })
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabase
      .from('profiles')
      .update({ invitation_status: 'active' })
      .eq('id', user.id)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (signInError) {
      return NextResponse.json({
        success: true,
        auto_login: false,
        message: 'Contraseña configurada. Ahora puedes iniciar sesión.',
      })
    }

    const sessionToken = data.session.access_token
    const refreshToken = data.session.refresh_token

    return NextResponse.json({
      success: true,
      auto_login: true,
      access_token: sessionToken,
      refresh_token: refreshToken,
      message: 'Contraseña configurada. Iniciando sesión...',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}
