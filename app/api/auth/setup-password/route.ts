import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { invite_token, password, email: bodyEmail } = body

    if (!password) {
      return NextResponse.json({ error: 'La contraseña es requerida' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 })
    }

    let userId: string | null = null
    let userEmail: string | null = null

    // First, try to get session user (if authenticated)
    const supabase = await createClient()
    const { data: { user: sessionUser } } = await supabase.auth.getUser()

    if (sessionUser) {
      userId = sessionUser.id
      userEmail = sessionUser.email || null
    }

    // If no session, try to decode invite token to find user
    if (!userId && invite_token) {
      try {
        const decoded = Buffer.from(invite_token, 'base64url').toString('utf-8')
        const [emailPart] = decoded.split(':')
        
        if (emailPart) {
          console.log('Looking for user with email:', emailPart)
          
          // List users and find by email
          const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers()
          
          if (!listError && usersData?.users) {
            const foundUser = usersData.users.find(u => 
              u.email?.toLowerCase() === emailPart.toLowerCase()
            )
            
            if (foundUser) {
              console.log('Found user:', foundUser.id, foundUser.email)
              userId = foundUser.id
              userEmail = foundUser.email || null
            } else {
              console.log('User not found for email:', emailPart)
            }
          }
        }
      } catch (decodeError) {
        console.error('Error decoding invite token:', decodeError)
      }
    }

    // If still no user, try body email
    if (!userId && bodyEmail) {
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers()
      const foundUser = usersData?.users.find(u => 
        u.email?.toLowerCase() === bodyEmail.toLowerCase()
      )
      if (foundUser) {
        userId = foundUser.id
        userEmail = foundUser.email || null
      }
    }

    if (!userId) {
      console.error('Could not find user for setup-password', { invite_token, bodyEmail })
      return NextResponse.json({ 
        error: 'No se pudo verificar el usuario. El enlace puede haber expirado o el usuario no existe.' 
      }, { status: 401 })
    }

    console.log('Setting password for user:', userId, userEmail)

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Update profile invitation status
    await supabaseAdmin
      .from('profiles')
      .update({ invitation_status: 'active' })
      .eq('id', userId)

    // Try to sign in
    const supabaseAuth = await createClient()
    if (userEmail) {
      const { data, error: signInError } = await supabaseAuth.auth.signInWithPassword({
        email: userEmail,
        password,
      })

      if (!signInError && data.session) {
        return NextResponse.json({
          success: true,
          auto_login: true,
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          message: 'Contraseña configurada. Iniciando sesión...',
        })
      }
    }

    return NextResponse.json({
      success: true,
      auto_login: false,
      message: 'Contraseña configurada. Ahora puedes iniciar sesión.',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }, { status: 500 })
  }
}
