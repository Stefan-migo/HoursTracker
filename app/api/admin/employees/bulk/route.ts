import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const bulkActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Se requiere al menos un ID'),
  action: z.enum(['activate', 'deactivate', 'delete', 'change_role']),
  role: z.enum(['admin', 'employee']).optional(),
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
      return NextResponse.json({ error: 'Solo admins pueden realizar acciones masivas' }, { status: 403 })
    }

    const body = await request.json()
    
    const validationResult = bulkActionSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { ids, action, role } = validationResult.data

    // Prevent self-modification in bulk actions
    if (ids.includes(user.id)) {
      if (action === 'deactivate' || action === 'delete') {
        return NextResponse.json(
          { error: 'No puedes desactivar o eliminarte a ti mismo' },
          { status: 400 }
        )
      }
      if (action === 'change_role' && role !== 'admin') {
        return NextResponse.json(
          { error: 'No puedes cambiar tu propio rol de administrador' },
          { status: 400 }
        )
      }
    }

    let result

    switch (action) {
      case 'activate':
        result = await supabase
          .from('profiles')
          .update({ is_active: true })
          .in('id', ids)
        break

      case 'deactivate':
        result = await supabase
          .from('profiles')
          .update({ is_active: false })
          .in('id', ids)
        break

      case 'change_role':
        if (!role) {
          return NextResponse.json(
            { error: 'Se requiere especificar el rol' },
            { status: 400 }
          )
        }
        result = await supabase
          .from('profiles')
          .update({ role })
          .in('id', ids)
        break

      case 'delete':
        // Delete auth users first, then profiles will be cascade deleted
        for (const id of ids) {
          const { error } = await supabase.auth.admin.deleteUser(id)
          if (error) {
            console.error(`Error deleting user ${id}:`, error)
            return NextResponse.json(
              { error: `Error al eliminar usuario: ${error.message}` },
              { status: 500 }
            )
          }
        }
        return NextResponse.json({ 
          success: true, 
          message: `${ids.length} empleado(s) eliminado(s) correctamente` 
        })

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }

    if (result.error) {
      console.error('Bulk action error:', result.error)
      return NextResponse.json(
        { error: result.error.message },
        { status: 500 }
      )
    }

    const actionMessages: Record<string, string> = {
      activate: 'activado(s)',
      deactivate: 'desactivado(s)',
      change_role: 'actualizado(s)',
    }

    return NextResponse.json({ 
      success: true, 
      message: `${ids.length} empleado(s) ${actionMessages[action]} correctamente`,
      count: ids.length
    })
  } catch (error) {
    console.error('Error in POST /api/admin/employees/bulk:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
