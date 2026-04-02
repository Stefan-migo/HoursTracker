import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getInviteEmailHtml } from './templates/invite'

interface SendInviteOptions {
  email: string
  fullName: string
}

interface SendInviteResult {
  success: boolean
  method: 'supabase' | 'resend' | 'manual'
  userId?: string
  inviteUrl?: string
  error?: string
}

export async function sendInviteEmail({
  email,
  fullName,
}: SendInviteOptions): Promise<SendInviteResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        data: {
          full_name: fullName,
        },
      }
    )

    console.log('Supabase invite response:', { data, error })

    if (error) {
      console.error('Supabase invite error:', error.message)
      if (error.message.includes('already')) {
        return { success: false, method: 'supabase', error: 'El usuario ya existe' }
      }
      if (error.message.includes('Database error')) {
        console.log('Supabase invite failed with database error, trying Resend fallback')
        return sendInviteViaResend(email, fullName, appUrl)
      }
      return { success: false, method: 'supabase', error: error.message }
    }

    if (data?.user) {
      console.log('Invite sent via Supabase to:', email, 'userId:', data.user.id)
      return { success: true, method: 'supabase', userId: data.user.id }
    }

    return { success: false, method: 'supabase', error: 'No user data returned' }
  } catch (supabaseError) {
    console.error('Supabase invite failed, trying Resend fallback:', supabaseError)
    return sendInviteViaResend(email, fullName, appUrl)
  }
}

async function sendInviteViaResend(
  email: string,
  fullName: string,
  appUrl: string
): Promise<SendInviteResult> {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey || resendApiKey === 're_xxxxxxxxxxxxx') {
    return {
      success: false,
      method: 'manual',
      error: 'No email service configured. Please use manual link.',
      inviteUrl: `${appUrl}/login?invite=manual&email=${encodeURIComponent(email)}`,
    }
  }

  try {
    const resend = new Resend(resendApiKey)
    const senderEmail = process.env.EMAIL_FROM || 'HoursTracker <onboarding@resend.dev>'

    const inviteToken = generateInviteToken(email)
    const inviteUrl = `${appUrl}/login?invite=${inviteToken}`

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: senderEmail,
      to: email.toLowerCase(),
      subject: 'Invitación a HoursTracker - Crea tu contraseña',
      html: getInviteEmailHtml(fullName, inviteUrl),
    })

    if (emailError) {
      console.error('Resend error:', emailError)
      return {
        success: false,
        method: 'manual',
        error: emailError.message,
        inviteUrl,
      }
    }

    console.log('Invite sent via Resend:', emailData?.id)
    return { success: true, method: 'resend', inviteUrl }
  } catch (resendError) {
    console.error('Resend failed:', resendError)
    return {
      success: false,
      method: 'manual',
      error: resendError instanceof Error ? resendError.message : 'Unknown error',
      inviteUrl: `${appUrl}/login?invite=manual&email=${encodeURIComponent(email)}`,
    }
  }
}

function generateInviteToken(email: string): string {
  return Buffer.from(`${email}:${Date.now()}`).toString('base64url')
}
