import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sendInviteEmail } from '@/lib/email/sender'

const bulkActionSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'Se requiere al menos un ID'),
  action: z.enum(['activate', 'deactivate', 'delete', 'change_role', 'send_invitation']),
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
        // Delete related data first, then auth users, then profiles will be cascade deleted
        for (const id of ids) {
          // Delete related time_logs (where user is the worker)
          const { error: timeLogsError } = await supabase
            .from('time_logs')
            .delete()
            .eq('user_id', id)
          
          if (timeLogsError) {
            console.error(`Error deleting time_logs for ${id}:`, timeLogsError)
          }

          // Delete related time_logs (where user marked the log)
          const { error: markedLogsError } = await supabase
            .from('time_logs')
            .delete()
            .eq('edited_by', id)
          
          if (markedLogsError) {
            console.error(`Error deleting marked time_logs for ${id}:`, markedLogsError)
          }

          // Delete related mediations (as employee)
          const { error: mediationError } = await supabase
            .from('mediations')
            .delete()
            .eq('employee_id', id)
          
          if (mediationError) {
            console.error(`Error deleting mediations for ${id}:`, mediationError)
          }

          // Delete related invitation_records
          const { error: invitationError } = await supabase
            .from('invitation_records')
            .delete()
            .eq('worker_id', id)
          
          if (invitationError) {
            console.error(`Error deleting invitation_records for ${id}:`, invitationError)
          }

          // Delete related work_group_members
          const { error: workGroupError } = await supabase
            .from('work_group_members')
            .delete()
            .eq('worker_id', id)
          
          if (workGroupError) {
            console.error(`Error deleting work_group_members for ${id}:`, workGroupError)
          }

          // Now delete from auth.users
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers()
          const userExists = userList?.users.some(u => u.id === id)
          
          if (!userExists) {
            console.log(`User ${id} not found in auth.users, skipping delete from auth`)
            continue
          }
          
          const { error } = await supabaseAdmin.auth.admin.deleteUser(id)
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
          message: `${ids.length} trabajador(es) eliminado(s) correctamente` 
        })

      case 'send_invitation':
        const { data: employeesToInvite } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', ids)
          .not('email', 'is', null)

        if (!employeesToInvite || employeesToInvite.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'No hay trabajadores con email para invitar'
          }, { status: 400 })
        }

        let invitedCount = 0
        const failedEmails: string[] = []

        for (const emp of employeesToInvite) {
          if (!emp.email) continue

          const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(emp.id)

          if (existingUser?.user) {
            const isPlaceholder = existingUser.user.email?.includes('placeholder.local')
            
            if (isPlaceholder) {
              console.log(`Deleting placeholder user ${emp.id} to re-invite with real email`)
              const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(emp.id)
              if (deleteError) {
                console.error('Error deleting placeholder user:', deleteError)
                failedEmails.push(emp.email)
                continue
              }
            } else {
              console.log(`User ${emp.id} already exists in auth with real email, skipping invite`)
              failedEmails.push(emp.email)
              continue
            }
          }

          const result = await sendInviteEmail({
            email: emp.email,
            fullName: emp.full_name || 'Usuario',
          })

          if (result.success) {
            await supabase
              .from('profiles')
              .update({ invitation_status: 'pending' })
              .eq('id', emp.id)
            invitedCount++
          } else {
            failedEmails.push(emp.email)
          }
        }

        if (failedEmails.length > 0) {
          return NextResponse.json({
            success: invitedCount > 0,
            message: `${invitedCount} invitación(es) enviadas, ${failedEmails.length} fallidas (usuarios ya existen)`,
            failedEmails
          })
        }

        return NextResponse.json({ 
          success: true, 
          message: `${invitedCount} invitación(es) enviada(s) correctamente`,
          count: invitedCount
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
      message: `${ids.length} trabajador(es) ${actionMessages[action]} correctamente`,
      count: ids.length
    })
  } catch (error) {
    console.error('Error in POST /api/admin/workers/bulk:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
