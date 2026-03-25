import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const postSchema = z.object({
  email: z.string().email('Email inválido'),
})

export async function POST(request: Request) {
  try {
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
      return NextResponse.json({ error: 'Solo admins pueden resetear contraseñas' }, { status: 403 })
    }

    const body = await request.json()
    
    const validationResult = postSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { email } = validationResult.data

    // Send password reset email using Supabase Auth
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?type=recovery`,
    })

    if (error) {
      console.error('Error sending password reset email:', error)
      return NextResponse.json(
        { error: 'Error al enviar email de recuperación' },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      message: 'Email de recuperación enviado correctamente'
    })
  } catch (error) {
    console.error('Error in POST /api/admin/workers/reset-password:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
