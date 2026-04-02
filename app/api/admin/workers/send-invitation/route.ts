import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

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
      
      // It's a placeholder user - delete and recreate with real email using Supabase invite
      console.log('Deleting placeholder user and sending invite via Supabase to:', employee.email)
      
      // Delete placeholder user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(employeeId)
      if (deleteError) {
        console.error('Error deleting placeholder user:', deleteError)
        return NextResponse.json({ 
          error: `No se pudo actualizar el usuario: ${deleteError.message}`,
        }, { status: 500 })
      }
      
      // Use Supabase's inviteUserByEmail - it sends email automatically
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        employee.email,
        { data: { full_name: employee.full_name } }
      )
      
      if (inviteError) {
        console.error('Error sending Supabase invite:', inviteError)
        return NextResponse.json({ 
          error: `Error al enviar invitación: ${inviteError.message}`,
        }, { status: 500 })
      }
      
      if (!inviteData.user) {
        return NextResponse.json({ 
          error: 'No se pudo crear la invitación',
        }, { status: 500 })
      }
      
      // Update profile with new user ID
      await supabaseAdmin
        .from('profiles')
        .update({ 
          id: inviteData.user.id,
          invitation_status: 'pending'
        })
        .eq('id', employeeId)
      
      return NextResponse.json({
        success: true,
        message: 'Invitación enviada. El empleado recibirá un correo para crear su contraseña.',
        invitation_status: 'pending',
        email_sent: true
      })
    } else {
      // No auth user exists - use Supabase's inviteUserByEmail
      console.log('No auth user found, sending Supabase invite to:', employee.email)
      
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        employee.email,
        { data: { full_name: employee.full_name } }
      )
      
      if (inviteError) {
        console.error('Error sending Supabase invite:', inviteError)
        return NextResponse.json({ 
          error: `Error al enviar invitación: ${inviteError.message}`,
        }, { status: 500 })
      }
      
      if (!inviteData.user) {
        return NextResponse.json({ 
          error: 'No se pudo crear la invitación',
        }, { status: 500 })
      }
      
      // Update profile with new user ID
      await supabaseAdmin
        .from('profiles')
        .update({ 
          id: inviteData.user.id,
          invitation_status: 'pending'
        })
        .eq('id', employeeId)
      
      return NextResponse.json({
        success: true,
        message: 'Invitación enviada. El empleado recibirá un correo para crear su contraseña.',
        invitation_status: 'pending',
        email_sent: true
      })
    }
  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
