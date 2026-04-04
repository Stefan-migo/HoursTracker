import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getInviteEmailHtml } from './templates/invite'

interface SendInviteOptions {
  email: string
  fullName: string
  appUrl?: string
}

interface SendInviteResult {
  success: boolean
  method: 'manual'
  userId?: string
  inviteUrl?: string
  error?: string
}

export async function sendInviteEmail({
  email,
  fullName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}: SendInviteOptions): Promise<SendInviteResult> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(
      Buffer.from(email.toLowerCase()).toString('base64').slice(0, 8)
    ).catch(() => ({ data: null, error: null }))

    const { data: userData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        data: {
          full_name: fullName,
        },
      }
    )

    if (inviteError) {
      console.error('Supabase invite error:', inviteError.message)
      if (inviteError.message.includes('already')) {
        return { success: false, method: 'manual', error: 'El usuario ya existe' }
      }
      return { success: false, method: 'manual', error: inviteError.message }
    }

    if (!userData?.user) {
      return { success: false, method: 'manual', error: 'No user data returned' }
    }

    const inviteToken = generateInviteToken(email.toLowerCase())
    const inviteUrl = `${appUrl}/login?invite=${inviteToken}&email=${encodeURIComponent(email.toLowerCase())}`

    console.log('Sending custom invite email to:', email, 'with URL:', inviteUrl)

    const emailResult = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: email.toLowerCase(),
      subject: 'Invitación a HoursTracker - Crea tu contraseña',
      html: getInviteEmailHtml(fullName, inviteUrl),
    })

    if (emailResult.error) {
      console.error('Resend email error:', emailResult.error)
      return { success: false, method: 'manual', error: 'Error al enviar email' }
    }

    console.log('Invite email sent via Resend to:', email, 'userId:', userData.user.id)
    return { 
      success: true, 
      method: 'manual', 
      userId: userData.user.id,
      inviteUrl 
    }
  } catch (supabaseError) {
    console.error('Invite process failed:', supabaseError)
    return { 
      success: false, 
      method: 'manual', 
      error: supabaseError instanceof Error ? supabaseError.message : 'Error desconocido' 
    }
  }
}

function generateInviteToken(email: string): string {
  return Buffer.from(`${email}:${Date.now()}`).toString('base64url')
}

export function generateManualInviteUrl(email: string, appUrl: string = 'http://localhost:3000'): string {
  const inviteToken = generateInviteToken(email)
  return `${appUrl}/login?invite=${inviteToken}`
}
