import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

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

    // Get employee data
    const { data: employee, error: empError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', employeeId)
      .single()

    if (empError || !employee) {
      return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 })
    }

    // Check if already has auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(employeeId)
    
    if (authUser?.user) {
      return NextResponse.json({ 
        error: 'El empleado ya tiene una cuenta activa',
        invitation_status: 'active'
      }, { status: 400 })
    }

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      id: employeeId,
      email: employee.email.toLowerCase(),
      email_confirm: true,
      user_metadata: {
        full_name: employee.full_name,
      },
    })

    if (createError) {
      console.error('Error creating auth user:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // Update profile status
    await supabase
      .from('profiles')
      .update({
        invitation_status: 'invited',
        invitation_sent_at: new Date().toISOString()
      })
      .eq('id', employeeId)

    // Send invitation email
    let emailSent = false
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (resendApiKey && resendApiKey !== 're_xxxxxxxxxxxxx') {
      try {
        const resend = new Resend(resendApiKey)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'HoursTracker <onboarding@resend.dev>',
          to: employee.email.toLowerCase(),
          subject: 'Invitación a HoursTracker - Crea tu contraseña',
          html: getEmailHtml(employee.full_name, `${appUrl}/login`),
        })
        
        emailSent = true
      } catch (emailError) {
        console.error('Error sending email:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? 'Invitación enviada correctamente'
        : 'Usuario creado. El email no pudo ser enviado, pero el empleado puede iniciar sesión.',
      invitation_status: 'invited',
      email_sent: emailSent
    })

  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

function getEmailHtml(fullName: string, loginUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #0a84ff 0%, #007aff 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">HoursTracker</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Gestión de horarios simplificada</p>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="color: #1d1d1f; margin: 0 0 20px;">¡Bienvenido, ${fullName}!</h2>
      <p style="color: #6b7280; line-height: 1.6; margin: 0 0 20px;">
        Has sido invitado a unirte a <strong>HoursTracker</strong>. Para comenzar, inicia sesión y crea tu contraseña:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0a84ff 0%, #007aff 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Iniciar sesión
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 14px; text-align: center;">
        Si no solicitaste esta invitación, puedes ignorar este correo.
      </p>
    </div>
  </div>
</body>
</html>
`
}
