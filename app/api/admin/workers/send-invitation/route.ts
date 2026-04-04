import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getInviteEmailHtml } from '@/lib/email/templates/invite'

function generateInviteToken(email: string): string {
  return Buffer.from(`${email}:${Date.now()}`).toString('base64url')
}

function generateTempPassword(): string {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
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
    return NextResponse.json({ error: 'Solo admins pueden enviar invitaciones' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { employeeId, method = 'email' } = body

    if (!employeeId) {
      return NextResponse.json({ error: 'ID de empleado requerido' }, { status: 400 })
    }

    const { data: employee, error: empError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    if (!employee.email) {
      return NextResponse.json({ 
        error: 'El empleado no tiene email registrado' 
      }, { status: 400 })
    }

    const normalizedEmail = employee.email.toLowerCase()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hours-tracker-three.vercel.app'
    const inviteToken = generateInviteToken(normalizedEmail)
    const inviteUrl = `${appUrl}/login?invite=${inviteToken}&email=${encodeURIComponent(normalizedEmail)}`

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(employeeId)
    
    if (authUser?.user) {
      const isPlaceholder = authUser.user.email?.includes('placeholder.local')
      
      if (!isPlaceholder) {
        return NextResponse.json({ 
          error: 'El empleado ya tiene una cuenta activa',
          invitation_status: 'active'
        }, { status: 400 })
      }
      
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(employeeId)
      if (deleteError) {
        return NextResponse.json({ 
          error: `No se pudo actualizar el usuario: ${deleteError.message}`,
        }, { status: 500 })
      }
    }

    const tempPassword = generateTempPassword()

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true,
      user_metadata: { full_name: employee.full_name },
      password: tempPassword,
    })

    if (createError) {
      console.error('Error creating user:', createError)
      if (createError.message.includes('already')) {
        return NextResponse.json({ 
          error: 'El usuario ya existe' 
        }, { status: 400 })
      }
      return NextResponse.json({ 
        error: `Error al crear usuario: ${createError.message}` 
      }, { status: 500 })
    }

    if (!newUser.user) {
      return NextResponse.json({ 
        error: 'No se pudo crear el usuario' 
      }, { status: 500 })
    }

    const newUserId = newUser.user.id

    if (employee.email?.includes('placeholder.local') || !employee.email) {
      await supabaseAdmin
        .from('profiles')
        .update({ 
          id: newUserId,
          invitation_status: 'pending'
        })
        .eq('id', employeeId)
    } else {
      await supabase
        .from('profiles')
        .update({ invitation_status: 'pending' })
        .eq('id', employeeId)
    }

    if (method === 'email') {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
          to: normalizedEmail,
          subject: 'Invitación a HoursTracker - Crea tu contraseña',
          html: getInviteEmailHtml(employee.full_name, inviteUrl),
        })
      } catch (emailErr) {
        console.error('Error sending email:', emailErr)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: method === 'whatsapp' 
        ? 'Link generado. Compártelo por WhatsApp.'
        : 'Invitación enviada.',
      invitation_status: 'pending',
      invite_url: method === 'whatsapp' ? inviteUrl : undefined,
      method
    })
  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
