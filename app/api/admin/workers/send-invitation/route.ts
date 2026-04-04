import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

function generateInviteToken(email: string): string {
  return Buffer.from(`${email}:${Date.now()}`).toString('base64url')
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

    if (!employee.email && method === 'email') {
      return NextResponse.json({ 
        error: 'El empleado no tiene email registrado' 
      }, { status: 400 })
    }

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

    const targetEmail = employee.email || `pending-${Date.now()}@placeholder.local`
    
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      targetEmail,
      { data: { full_name: employee.full_name } }
    )
    
    if (inviteError) {
      console.error('Error sending Supabase invite:', inviteError)
      return NextResponse.json({ 
        error: `Error al crear invitación: ${inviteError.message}`,
      }, { status: 500 })
    }
    
    if (!inviteData.user) {
      return NextResponse.json({ 
        error: 'No se pudo crear la invitación',
      }, { status: 500 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteToken = generateInviteToken(targetEmail)
    const inviteUrl = `${appUrl}/login?invite=${inviteToken}&email=${encodeURIComponent(targetEmail)}`

    const newUserId = inviteData.user.id
    
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
    
    return NextResponse.json({
      success: true,
      message: method === 'whatsapp' 
        ? 'Link generado. Compártelo por WhatsApp.'
        : 'Invitación enviada.',
      invitation_status: 'pending',
      invite_url: inviteUrl,
      method
    })
  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
