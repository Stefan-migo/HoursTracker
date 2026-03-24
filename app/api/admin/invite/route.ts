import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Solo admins pueden invitar empleados' }, { status: 403 })
  }

  const body = await request.json()
  const { email, full_name, send_email = true } = body

  if (!email || !full_name) {
    return NextResponse.json({ error: 'Email y nombre son requeridos' }, { status: 400 })
  }

  // Check if email already exists in profiles
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existingProfile) {
    return NextResponse.json({ error: 'Ya existe un empleado con este email' }, { status: 400 })
  }

  try {
    let newUser;
    let tempPassword: string | null = null;

    if (send_email) {
      // Invite user via email - Supabase will send an invitation email
      const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email.toLowerCase(),
        {
          data: {
            full_name: full_name,
          },
        }
      )

      if (inviteError) {
        console.error('Error inviting user:', inviteError)
        return NextResponse.json({ error: inviteError.message }, { status: 500 })
      }

      newUser = data?.user
    } else {
      // Create user with temporary password (bypasses email rate limits)
      tempPassword = generateTempPassword()
      
      const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: true,
        user_metadata: {
          full_name: full_name,
        },
        password: tempPassword,
      })

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      newUser = data?.user
    }

    if (!newUser) {
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
    }

    // Update profile with additional info
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name,
        email: email.toLowerCase(),
        is_active: true,
      })
      .eq('id', newUser.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
    }

    if (tempPassword) {
      // Return temp password so admin can share it manually
      return NextResponse.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          full_name,
        },
        temp_password: tempPassword,
        message: `Empleado creado. Comparte esta contraseña temporal con ${full_name}: ${tempPassword}`,
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name,
      },
      message: 'Se ha enviado una invitación por email al empleado. Recibirá un enlace para crear su contraseña.',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}
