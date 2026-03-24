import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSupabaseError } from '@/lib/supabase/errors'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Get dispute to verify ownership and status
    const { data: dispute, error: fetchError } = await supabase
      .from('disputes')
      .select('employee_id, status')
      .eq('id', id)
      .single()

    if (fetchError) {
      console.error('Fetch dispute error:', fetchError)
      const { message, status } = handleSupabaseError(fetchError)
      return NextResponse.json({ error: message }, { status })
    }

    if (!dispute) {
      return NextResponse.json({ error: 'Disputa no encontrada' }, { status: 404 })
    }

    // Admin can delete any dispute, employee can only delete their own pending disputes
    if (profile?.role !== 'admin') {
      // Verify ownership
      if (dispute.employee_id !== user.id) {
        return NextResponse.json(
          { error: 'No tienes permiso para cancelar esta disputa' },
          { status: 403 }
        )
      }

      // Verify status is pending
      if (dispute.status !== 'pending') {
        return NextResponse.json(
          { error: 'Solo se pueden cancelar disputas pendientes' },
          { status: 400 }
        )
      }
    }

    // Delete the dispute
    const { error: deleteError } = await supabase
      .from('disputes')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      const { message, status } = handleSupabaseError(deleteError)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({
      success: true,
      message: 'Disputa cancelada exitosamente'
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/disputes/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
