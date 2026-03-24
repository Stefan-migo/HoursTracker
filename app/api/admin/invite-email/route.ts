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
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitación - HoursTracker</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7; color: #1d1d1f; line-height: 1.5;">
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f7;">
    <tr>
      <td align="center" style="padding: 48px 24px;">
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
          
          <tr>
            <td style="background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                HoursTracker
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 32px;">
              
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #1d1d1f;">
                Hola <strong>${fullName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #424245; line-height: 1.6;">
                Has sido invitado a unirte a <strong>HoursTracker</strong>. Para comenzar, crea tu contraseña haciendo clic en el siguiente botón:
              </p>
              
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(10, 132, 255, 0.4);">
                  Crear mi contraseña
                </a>
              </div>
              
              <div style="background-color: #f5f5f7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #98989d; text-transform: uppercase; letter-spacing: 0.5px;">
                  O copia y pega este enlace en tu navegador:
                </p>
                <p style="margin: 0; font-size: 13px; color: #0a84ff; word-break: break-all;">
                  ${inviteUrl}
                </p>
              </div>
              
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #98989d;">
                Este enlace expira en <strong>7 días</strong>.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e5ea; margin: 24px 0;">
              
              <p style="margin: 0; font-size: 14px; color: #98989d;">
                Si no solicitaste esta invitación, puedes ignorar este correo.
              </p>
              
            </td>
          </tr>
          
          <tr>
            <td style="padding: 0 32px;">
              <div style="height: 1px; background-color: #e5e5ea;"></div>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #1d1d1f; font-weight: 600;">
                HoursTracker
              </p>
              <p style="margin: 0; font-size: 13px; color: #98989d;">
                Este es un correo automático. Por favor, no respondas a este mensaje.
              </p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
  
</body>
</html>
`
}
