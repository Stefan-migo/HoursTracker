import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

const ADMIN_SIGNUP_CODE = process.env.NEXT_PUBLIC_ADMIN_SIGNUP_CODE

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fullName, email, password, adminCode } = body

    if (!fullName || !email || !password) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 })
    }

    if (!ADMIN_SIGNUP_CODE) {
      return NextResponse.json({ error: 'Código de administrador no configurado en el servidor' }, { status: 500 })
    }

    if (adminCode !== ADMIN_SIGNUP_CODE) {
      return NextResponse.json({ error: 'Código de administrador inválido' }, { status: 401 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user: existingUser } } = await supabase.auth.getUser()

    if (existingUser) {
      return NextResponse.json({ error: 'Ya hay una sesión activa' }, { status: 400 })
    }

    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: 'admin',
      },
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    if (!data?.user) {
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta creada. Ahora puedes iniciar sesión.',
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}