import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { sendInviteEmail } from '@/lib/email/sender'

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
    return NextResponse.json({ error: 'Solo admins pueden invitar trabajadores' }, { status: 403 })
  }

  const body = await request.json()
  const { email, full_name, sendInvitation = true } = body

  if (!full_name) {
    return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  }

  if (sendInvitation && !email) {
    return NextResponse.json({ error: 'El email es requerido para enviar invitación' }, { status: 400 })
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'El formato del email es inválido' }, { status: 400 })
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingProfile) {
      return NextResponse.json({ error: 'Ya existe un trabajador con este email' }, { status: 400 })
    }
  }

  if (!sendInvitation) {
    try {
      const placeholderEmail = `pending-${Date.now()}@placeholder.local`
      
      const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email: placeholderEmail,
        email_confirm: false,
        user_metadata: { full_name: full_name.trim() },
      })

      if (userError) {
        console.error('Error creating placeholder user:', userError)
        return NextResponse.json({ error: `Error al crear trabajador: ${userError.message}` }, { status: 500 })
      }

      if (!newUser.user) {
        return NextResponse.json({ error: 'Error al crear trabajador: sin usuario' }, { status: 500 })
      }

      const { data: newProfile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          full_name: full_name.trim(),
          email: null,
          role: 'employee',
          is_active: true,
          invitation_status: 'none',
        })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating profile:', profileError)
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return NextResponse.json({ error: `Error al crear trabajador: ${profileError.message}` }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        user: {
          id: newProfile.id,
          full_name: full_name.trim(),
        },
        message: 'Trabajador creado sin invitación',
      })
    } catch (err) {
      console.error('Unexpected error creating profile:', err)
      return NextResponse.json({ error: `Error: ${err instanceof Error ? err.message : 'Error desconocido'}` }, { status: 500 })
    }
  }

  try {
    const result = await sendInviteEmail({
      email: email.toLowerCase(),
      fullName: full_name,
    })

    const profileData = {
      full_name: full_name.trim(),
      email: email.toLowerCase(),
      role: 'employee' as const,
      is_active: true,
      invitation_status: result.success ? 'active' as const : 'pending' as const,
    }

    if (result.success && result.userId) {
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: result.userId,
          ...profileData,
        })

      return NextResponse.json({
        success: true,
        user: {
          id: result.userId,
          email: email.toLowerCase(),
          full_name,
        },
        message: result.method === 'supabase'
          ? 'Invitación enviada. El trabajador recibirá un correo con el enlace para crear su contraseña.'
          : 'Invitación enviada.',
      })
    }

    if (result.inviteUrl) {
      await supabaseAdmin
        .from('profiles')
        .upsert(profileData)

      return NextResponse.json({
        success: true,
        user: {
          email: email.toLowerCase(),
          full_name,
        },
        invite_url: result.inviteUrl,
        message: `Invitación creada. ${result.error || 'Copia el enlace para compartirlo manualmente.'}: ${result.inviteUrl}`,
      })
    }

    return NextResponse.json({
      success: false,
      error: result.error || 'Error al enviar invitación',
    }, { status: 500 })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}
