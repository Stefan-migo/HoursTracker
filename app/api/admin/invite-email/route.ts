import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

function generateInviteToken(userId: string, email: string) {
  return Buffer.from(`${userId}:${email}:${Date.now()}`).toString('base64url')
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
  const { email, full_name } = body

  if (!email || !full_name) {
    return NextResponse.json({ error: 'Email y nombre son requeridos' }, { status: 400 })
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (existingProfile) {
    return NextResponse.json({ error: 'Ya existe un empleado con este email' }, { status: 400 })
  }

  try {
    // Create user with email confirmed
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: true,
      user_metadata: {
        full_name: full_name,
      },
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    if (!newUser?.user) {
      return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
    }

    // Generate invite token
    const inviteToken = generateInviteToken(newUser.user.id, email)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${appUrl}/login?invite=${inviteToken}`

    // Update profile
    await supabase
      .from('profiles')
      .update({
        full_name,
        email: email.toLowerCase(),
        is_active: true,
      })
      .eq('id', newUser.user.id)

    // Send email via Resend if configured
    let emailSent = false
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (resendApiKey && resendApiKey !== 're_xxxxxxxxxxxxx') {
      try {
        const resend = new Resend(resendApiKey)
        
        // Get the verified sender (defaults to onboarding@resend.dev for testing)
        const senderEmail = process.env.EMAIL_FROM || 'HoursTracker <onboarding@resend.dev>'
        
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: senderEmail,
          to: email.toLowerCase(),
          subject: 'Invitación a HoursTracker - Crea tu contraseña',
          html: getEmailHtml(full_name, inviteUrl),
        })

        if (emailError) {
          console.error('Error sending email:', emailError)
        } else {
          emailSent = true
          console.log('Email sent:', emailData?.id)
        }
      } catch (err) {
        console.error('Resend error:', err)
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
        full_name,
      },
      invite_url: emailSent ? undefined : inviteUrl,
      message: emailSent 
        ? 'Empleado creado. Se ha enviado un correo con el enlace de invitación.'
        : `Empleado creado. Copia este enlace para el empleado: ${inviteUrl}`,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}

function getEmailHtml(fullName: string, inviteUrl: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">HoursTracker</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Gestión de horarios simplificada</p>
    </div>
    <div style="padding: 40px 30px;">
      <h2 style="color: #1f2937; margin: 0 0 20px;">¡Bienvenido, ${fullName}!</h2>
      <p style="color: #6b7280; line-height: 1.6; margin: 0 0 20px;">
        Has sido invitado a unirte a <strong>HoursTracker</strong>. Para comenzar, crea tu contraseña haciendo clic en el siguiente botón:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Crear mi contraseña
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 14px; text-align: center;">
        Este enlace expira en <strong>7 días</strong>.
      </p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      <p style="color: #9ca3af; font-size: 12px; text-align: center;">
        Si no solicitaste esta invitación, puedes ignorar este correo.
      </p>
    </div>
  </div>
</body>
</html>
`
}
