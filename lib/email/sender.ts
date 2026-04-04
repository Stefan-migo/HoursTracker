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
  method: 'resend'
  userId?: string
  inviteUrl?: string
  error?: string
}

function generateInviteToken(email: string): string {
  return Buffer.from(`${email}:${Date.now()}`).toString('base64url')
}

export async function sendInviteEmail({
  email,
  fullName,
  appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
}: SendInviteOptions): Promise<SendInviteResult> {
  try {
    const normalizedEmail = email.toLowerCase()

    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const userExists = existingUser?.users.some(u => u.email?.toLowerCase() === normalizedEmail)

    if (userExists) {
      return { success: false, method: 'resend', error: 'El usuario ya existe' }
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: false,
      user_metadata: { full_name: fullName },
    })

    if (createError) {
      console.error('Error creating user:', createError)
      return { success: false, method: 'resend', error: createError.message }
    }

    if (!newUser.user) {
      return { success: false, method: 'resend', error: 'No se pudo crear el usuario' }
    }

    const inviteToken = generateInviteToken(normalizedEmail)
    const inviteUrl = `${appUrl}/login?invite=${inviteToken}&email=${encodeURIComponent(normalizedEmail)}`

    console.log('Sending invite email via Resend to:', normalizedEmail, 'with URL:', inviteUrl)

    const resend = new Resend(process.env.RESEND_API_KEY)
    
    const emailResult = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: normalizedEmail,
      subject: 'Invitación a HoursTracker - Crea tu contraseña',
      html: getInviteEmailHtml(fullName, inviteUrl),
    })

    if (emailResult.error) {
      console.error('Resend email error:', emailResult.error)
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      return { success: false, method: 'resend', error: 'Error al enviar email' }
    }

    console.log('Invite email sent via Resend to:', normalizedEmail, 'userId:', newUser.user.id)
    return { 
      success: true, 
      method: 'resend', 
      userId: newUser.user.id,
      inviteUrl 
    }
  } catch (err) {
    console.error('Invite process failed:', err)
    return { 
      success: false, 
      method: 'resend', 
      error: err instanceof Error ? err.message : 'Error desconocido' 
    }
  }
}
