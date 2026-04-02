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
    return NextResponse.json({ error: 'Solo admins pueden enviar invitaciones' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { employeeId } = body

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
        error: 'El empleado no tiene email registrado. Edita el perfil primero para agregar un email.' 
      }, { status: 400 })
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(employeeId)
    
    if (authUser?.user) {
      // Check if it's a placeholder user (no real email)
      const isPlaceholder = authUser.user.email?.includes('placeholder.local')
      
      if (!isPlaceholder) {
        return NextResponse.json({ 
          error: 'El empleado ya tiene una cuenta activa',
          invitation_status: 'active'
        }, { status: 400 })
      }
      
      // It's a placeholder user - update with real email and send invite
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        employeeId,
        { email: employee.email }
      )
      
      if (updateError) {
        return NextResponse.json({ 
          error: 'No se pudo actualizar el email del usuario',
        }, { status: 500 })
      }
    }

    const result = await sendInviteEmail({
      email: employee.email,
      fullName: employee.full_name || 'Usuario',
    })

    if (result.success) {
      await supabase
        .from('profiles')
        .update({
          invitation_status: 'active',
          invitation_sent_at: new Date().toISOString()
        })
        .eq('id', employeeId)

      return NextResponse.json({
        success: true,
        message: result.method === 'supabase'
          ? 'Invitación enviada. El empleado recibirá un correo para crear su contraseña.'
          : 'Invitación enviada.',
        invitation_status: 'active',
        email_sent: true
      })
    }

    return NextResponse.json({
      success: false,
      message: `No se pudo enviar la invitación. ${result.error || ''}`,
      invite_url: result.inviteUrl,
      invitation_status: 'pending'
    }, { status: 500 })

  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
