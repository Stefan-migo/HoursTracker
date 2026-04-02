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

  // Try Supabase invite first
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
        console.log('Supabase invite failed with database error, trying manual creation')
        return createUserAndSendResend(email, fullName, appUrl)
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
    return createUserAndSendResend(email, fullName, appUrl)
  }
}

async function createUserAndSendResend(
  email: string,
  fullName: string,
  appUrl: string
): Promise<SendInviteResult> {
  try {
    // Create user in Supabase Auth with email not confirmed
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      email_confirm: false,
      user_metadata: { full_name: fullName },
    })

    if (createError) {
      console.error('Error creating user:', createError)
      if (createError.message.includes('already')) {
        return { success: false, method: 'resend', error: 'El usuario ya existe' }
      }
      return { success: false, method: 'resend', error: createError.message }
    }

    if (!newUser.user) {
      return { success: false, method: 'resend', error: 'No se pudo crear el usuario' }
    }

    // Create profile manually to avoid trigger dependency
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newUser.user.id,
        email: email.toLowerCase(),
        full_name: fullName,
        role: 'employee',
        is_active: true,
        invitation_status: 'invited',
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      // Continue anyway, profile might already exist
    }

    // Generate custom invite token
    const inviteToken = generateInviteToken(email)
    const inviteUrl = `${appUrl}/login?invite=${inviteToken}`

    // Send email with Resend
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey || resendApiKey === 're_xxxxxxxxxxxxx') {
      return {
        success: true,
        method: 'manual',
        userId: newUser.user.id,
        inviteUrl: `${appUrl}/login?invite=manual&email=${encodeURIComponent(email)}`,
      }
    }

    const resend = new Resend(resendApiKey)
    const senderEmail = process.env.EMAIL_FROM || 'HoursTracker <onboarding@resend.dev>'

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
        method: 'resend',
        error: emailError.message,
        inviteUrl,
      }
    }

    console.log('Invite sent via Resend:', emailData?.id)
    return { success: true, method: 'resend', userId: newUser.user.id, inviteUrl }
  } catch (error) {
    console.error('Error in createUserAndSendResend:', error)
    return {
      success: false,
      method: 'resend',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

function generateInviteToken(email: string): string {
  return Buffer.from(`${email}:${Date.now()}`).toString('base64url')
}
