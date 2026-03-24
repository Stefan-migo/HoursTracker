import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSupabaseError } from '@/lib/supabase/errors'
import { z } from 'zod'

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Debes seleccionar al menos un registro'),
})

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      const { message, status } = handleSupabaseError(profileError)
      return NextResponse.json({ error: message }, { status })
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const validationResult = bulkDeleteSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { ids } = validationResult.data

    // Delete all selected logs
    const { error } = await supabase
      .from('time_logs')
      .delete()
      .in('id', ids)

    if (error) {
      console.error('Bulk delete error:', error)
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ 
      success: true, 
      deleted: ids.length 
    })
  } catch (error) {
    console.error('Unexpected error in bulk delete:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
