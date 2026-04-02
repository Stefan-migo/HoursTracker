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

    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(employeeId)
    
    if (getUserError) {
      console.error('Error getting auth user:', getUserError)
    }
    
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
      console.log('Updating placeholder user email to:', employee.email)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        employeeId,
        { email: employee.email }
      )
      
      if (updateError) {
        console.error('Error updating user email:', updateError)
        return NextResponse.json({ 
          error: `No se pudo actualizar el email: ${updateError.message}`,
        }, { status: 500 })
      }
    } else {
      // No auth user exists - need to create one first
      console.log('No auth user found, creating one for:', employee.email)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: employee.email,
        email_confirm: false,
        user_metadata: { full_name: employee.full_name },
      })
      
      if (createError) {
        console.error('Error creating auth user:', createError)
        return NextResponse.json({ 
          error: `No se pudo crear el usuario: ${createError.message}`,
        }, { status: 500 })
      }
      
      if (!newUser.user) {
        return NextResponse.json({ 
          error: 'No se pudo crear el usuario',
        }, { status: 500 })
      }
      
      // Create profile manually
      await supabaseAdmin
        .from('profiles')
        .upsert({
          id: newUser.user.id,
          email: employee.email,
          full_name: employee.full_name,
          role: 'employee',
          is_active: true,
          invitation_status: 'invited',
        })
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
