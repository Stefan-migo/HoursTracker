import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function getEmailTemplate(fullName: string, confirmUrl: string) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirma tu correo - HoursTracker</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f7; color: #1d1d1f; line-height: 1.5;">
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f7;">
    <tr>
      <td align="center" style="padding: 48px 24px;">
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08); overflow: hidden;">
          
          <tr>
            <td style="background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                ¡Bienvenido a HoursTracker!
              </h1>
            </td>
          </tr>
          
          <tr>
            <td style="padding: 40px 32px;">
              
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #1d1d1f;">
                Hola <strong>${fullName}</strong>,
              </p>
              
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #424245; line-height: 1.6;">
                Gracias por registrarte en <strong>HoursTracker</strong>. Tu cuenta de administrador ha sido creada exitosamente.
              </p>
              
              <p style="margin: 0 0 32px 0; font-size: 15px; color: #424245; line-height: 1.6;">
                Por favor, confirma tu dirección de correo electrónico haciendo clic en el siguiente botón:
              </p>
              
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${confirmUrl}" style="display: inline-block; background: linear-gradient(135deg, #0a84ff 0%, #0066cc 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 16px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(10, 132, 255, 0.4);">
                  Confirmar correo electrónico
                </a>
              </div>
              
              <div style="background-color: #f5f5f7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #98989d; text-transform: uppercase; letter-spacing: 0.5px;">
                  O copia y pega este enlace en tu navegador:
                </p>
                <p style="margin: 0; font-size: 13px; color: #0a84ff; word-break: break-all;">
                  ${confirmUrl}
                </p>
              </div>
              
              <p style="margin: 0; font-size: 14px; color: #98989d;">
                Si no solicitaste este registro, puedes ignorar este correo. Tu cuenta no será activada hasta que confirmes tu email.
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

export async function POST(request: Request) {
  try {
    const { email, fullName, confirmationUrl } = await request.json()

    if (!email || !confirmationUrl) {
      return NextResponse.json(
        { error: 'Email and confirmation URL are required' },
        { status: 400 }
      )
    }

    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey || resendApiKey === 're_xxxxxxxxxxxxx') {
      console.log('Resend API key not configured, skipping email send')
      return NextResponse.json({ success: true, skipped: true })
    }

    const resend = new Resend(resendApiKey)
    const senderEmail = process.env.EMAIL_FROM || 'HoursTracker <onboarding@resend.dev>'

    const { data, error } = await resend.emails.send({
      from: senderEmail,
      to: email,
      subject: 'Confirma tu correo - HoursTracker',
      html: getEmailTemplate(fullName || 'Usuario', confirmationUrl),
    })

    if (error) {
      console.error('Error sending confirmation email:', error)
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, emailId: data?.id })
  } catch (error) {
    console.error('Error in send-confirmation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
