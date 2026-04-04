import { supabaseAdmin } from '@/lib/supabase/admin'

interface SendInviteOptions {
  email: string
  fullName: string
}

interface SendInviteResult {
  success: boolean
  method: 'supabase'
  userId?: string
  inviteUrl?: string
  error?: string
}

export async function sendInviteEmail({
  email,
  fullName,
}: SendInviteOptions): Promise<SendInviteResult> {
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
      return { success: false, method: 'supabase', error: error.message }
    }

    if (data?.user) {
      console.log('Invite sent via Supabase to:', email, 'userId:', data.user.id)
      return { success: true, method: 'supabase', userId: data.user.id }
    }

    return { success: false, method: 'supabase', error: 'No user data returned' }
  } catch (supabaseError) {
    console.error('Supabase invite failed:', supabaseError)
    return { 
      success: false, 
      method: 'supabase', 
      error: supabaseError instanceof Error ? supabaseError.message : 'Error desconocido' 
    }
  }
}
