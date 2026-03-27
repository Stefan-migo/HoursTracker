import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSupabaseError } from '@/lib/supabase/errors'
import { z } from 'zod'

// GET /api/mediations/[id] - Get mediation detail
export async function GET(
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

    // Get user role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      const { message, status } = handleSupabaseError(profileError)
      return NextResponse.json({ error: message }, { status })
    }

    const isAdmin = profile?.role === 'admin'

    // Fetch mediation process enabled setting
    const { data: processSettings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'mediation_process_enabled')
      .single()
    
    const mediationProcessEnabled = processSettings?.value?.enabled ?? true

    // Fetch mediation with all related data
    const { data: mediation, error } = await supabase
      .from('mediations')
      .select(`
        *,
        employee:employee_id (
          full_name,
          email
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message }, { status })
    }

    if (!mediation) {
      return NextResponse.json({ error: 'Mediación no encontrada' }, { status: 404 })
    }

    // Check permissions
    if (!isAdmin && mediation.employee_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Fetch current time log values
    let adminRecord = null
    let employeeRecord = null

    if (mediation.admin_time_log_id) {
      const { data: adminLog } = await supabase
        .from('time_logs')
        .select(`
          id,
          clock_in,
          clock_out,
          total_hours,
          is_manual,
          edited_by,
          edited_at,
          edit_reason,
          marked_by,
          profiles!time_logs_marked_by_fkey(full_name)
        `)
        .eq('id', mediation.admin_time_log_id)
        .single()

      if (adminLog) {
        adminRecord = {
          id: adminLog.id,
          clock_in: adminLog.clock_in,
          clock_out: adminLog.clock_out,
          total_hours: adminLog.total_hours,
          is_manual: adminLog.is_manual,
          edited_at: adminLog.edited_at,
          edit_reason: adminLog.edit_reason,
          marked_by: adminLog.profiles?.[0]?.full_name || 'Sistema',
          is_editable: isAdmin,
        }
      }
    }

    if (mediation.employee_time_log_id) {
      const { data: employeeLog } = await supabase
        .from('time_logs')
        .select(`
          id,
          clock_in,
          clock_out,
          total_hours,
          is_manual,
          edited_by,
          edited_at,
          edit_reason,
          marked_by,
          profiles!time_logs_marked_by_fkey(full_name)
        `)
        .eq('id', mediation.employee_time_log_id)
        .single()

      if (employeeLog) {
        employeeRecord = {
          id: employeeLog.id,
          clock_in: employeeLog.clock_in,
          clock_out: employeeLog.clock_out,
          total_hours: employeeLog.total_hours,
          is_manual: employeeLog.is_manual,
          edited_at: employeeLog.edited_at,
          edit_reason: employeeLog.edit_reason,
          marked_by: employeeLog.profiles?.[0]?.full_name || 'Sistema',
          is_editable: !isAdmin, // Employee can edit their own
        }
      }
    }

    // Calculate differences
    const adminClockIn = mediation.admin_clock_in_snap
    const employeeClockIn = mediation.employee_clock_in_snap
    const adminClockOut = mediation.admin_clock_out_snap
    const employeeClockOut = mediation.employee_clock_out_snap
    const adminHours = mediation.admin_total_hours_snap
    const employeeHours = mediation.employee_total_hours_snap

    let clockInDiffMinutes: number | null = null
    let clockOutDiffMinutes: number | null = null
    let hoursDiff: number | null = null

    if (adminClockIn && employeeClockIn) {
      clockInDiffMinutes = Math.round(
        (new Date(adminClockIn).getTime() - new Date(employeeClockIn).getTime()) / (1000 * 60)
      )
    }

    if (adminClockOut && employeeClockOut) {
      clockOutDiffMinutes = Math.round(
        (new Date(adminClockOut).getTime() - new Date(employeeClockOut).getTime()) / (1000 * 60)
      )
    }

    if (adminHours !== null && employeeHours !== null) {
      hoursDiff = adminHours - employeeHours
    }

    // Check if stale (48 hours without activity)
    const now = new Date()
    const lastActivity = new Date(
      Math.max(
        new Date(mediation.created_at).getTime(),
        new Date(mediation.admin_last_activity_at || 0).getTime(),
        new Date(mediation.employee_last_activity_at || 0).getTime()
      )
    )
    const isStale = now.getTime() - lastActivity.getTime() > 48 * 60 * 60 * 1000

    // Build response
    const response = {
      id: mediation.id,
      date: mediation.date,
      status: mediation.status,
      initial_reason: mediation.initial_reason,
      resolution_notes: mediation.resolution_notes,
      created_at: mediation.created_at,
      resolved_at: mediation.resolved_at,
      
      employee: {
        id: mediation.employee_id,
        name: mediation.employee?.full_name,
        email: mediation.employee?.email,
      },

      admin_record: adminRecord,
      employee_record: employeeRecord,

      snapshots: {
        admin: {
          clock_in: mediation.admin_clock_in_snap,
          clock_out: mediation.admin_clock_out_snap,
          total_hours: mediation.admin_total_hours_snap,
        },
        employee: {
          clock_in: mediation.employee_clock_in_snap,
          clock_out: mediation.employee_clock_out_snap,
          total_hours: mediation.employee_total_hours_snap,
        },
      },

      proposed: mediation.proposed_by ? {
        clock_in: mediation.proposed_clock_in,
        clock_out: mediation.proposed_clock_out,
        total_hours: mediation.proposed_total_hours,
        proposed_by: mediation.proposed_by === mediation.employee_id ? 'employee' : 'admin',
        proposed_at: mediation.proposed_at,
      } : null,

      counter: mediation.counter_by ? {
        clock_in: mediation.counter_clock_in,
        clock_out: mediation.counter_clock_out,
        total_hours: mediation.counter_total_hours,
        proposed_by: mediation.counter_by === mediation.employee_id ? 'employee' : 'admin',
        proposed_at: mediation.counter_at,
      } : null,

      suggested: mediation.suggested_at ? {
        clock_in: mediation.suggested_clock_in,
        clock_out: mediation.suggested_clock_out,
        total_hours: mediation.suggested_total_hours,
        suggested_by: mediation.suggested_by,
        suggested_at: mediation.suggested_at,
      } : null,

      differences: {
        clock_in_diff_minutes: clockInDiffMinutes,
        clock_out_diff_minutes: clockOutDiffMinutes,
        hours_diff: hoursDiff,
        has_difference: clockInDiffMinutes !== 0 || clockOutDiffMinutes !== 0 || hoursDiff !== 0,
      },

      activity: {
        created_at: mediation.created_at,
        admin_last_activity_at: mediation.admin_last_activity_at,
        employee_last_activity_at: mediation.employee_last_activity_at,
        is_stale: isStale,
        stale_hours: isStale ? Math.round((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60)) : 0,
      },

      notes: mediation.notes || [],

      // Individual closure status
      is_closed_by_admin: !!mediation.admin_closed_at,
      is_closed_by_employee: !!mediation.employee_closed_at,
      is_closed_by_me: isAdmin ? !!mediation.admin_closed_at : !!mediation.employee_closed_at,
      
      // Change notifications (set when other party updated their record)
      sees_change: isAdmin ? mediation.employee_sees_change : mediation.admin_sees_change,

      permissions: {
        can_edit_own_record: isAdmin ? !!adminRecord : !!employeeRecord,
        can_edit_other_record: false,
        can_propose: mediationProcessEnabled && (mediation.status === 'pending_review' || mediation.status === 'in_discussion'),
        can_accept_proposal: mediationProcessEnabled && !!mediation.proposed_by && mediation.proposed_by !== user.id && mediation.status !== 'resolved' && mediation.status !== 'closed_no_changes',
        can_reject_proposal: mediationProcessEnabled && !!mediation.proposed_by && mediation.proposed_by !== user.id && mediation.status !== 'resolved' && mediation.status !== 'closed_no_changes',
        can_counter_proposal: mediationProcessEnabled && !!mediation.proposed_by && mediation.proposed_by !== user.id && mediation.status !== 'resolved' && mediation.status !== 'closed_no_changes',
        can_close: mediationProcessEnabled && mediation.status !== 'resolved' && mediation.status !== 'closed_no_changes',
        can_close_view: !isAdmin ? !mediation.employee_closed_at : !mediation.admin_closed_at,
        can_reopen_view: isAdmin ? !!mediation.admin_closed_at : !!mediation.employee_closed_at,
        can_comment: mediationProcessEnabled,
        is_admin: isAdmin,
        i_proposed: mediation.proposed_by === user.id,
        has_proposal: !!mediation.proposed_by,
        proposal_status: mediation.proposed_by === user.id ? 'waiting_accept' : (mediation.proposed_by && mediation.proposed_by !== user.id ? 'pending_my_accept' : null),
        mediation_process_enabled: mediationProcessEnabled,
      },
    }

    // Reset the sees_change flag for this user and clear individual closure if viewing
    const resetData: Record<string, unknown> = {}
    if (isAdmin) {
      if (mediation.employee_sees_change) resetData.employee_sees_change = false
      // Clear admin's closed status when they view (allows reopening)
    } else {
      if (mediation.admin_sees_change) resetData.admin_sees_change = false
    }

    if (Object.keys(resetData).length > 0) {
      await supabase.from('mediations').update(resetData).eq('id', id)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Unexpected error in GET /api/mediations/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

const putSchema = z.object({
  action: z.enum(['propose', 'accept', 'counter', 'reject', 'close', 'close_view', 'reopen_view', 'comment', 'update_record']),
  // Common fields
  comment: z.string().optional(),
  close_reason: z.string().optional(),
  // For propose/counter/update_record
  clock_in: z.string().optional(),
  clock_out: z.string().optional(),
  total_hours: z.number().nullable().optional(),
  reason: z.string().optional(),
  // For update_record
  time_log_id: z.string().uuid().optional(),
  // Display strings for timezone-correct messages (optional)
  clock_in_display: z.string().optional(),
  clock_out_display: z.string().optional(),
})

// PUT /api/mediations/[id] - Update mediation (propose, accept, close, comment)
export async function PUT(
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()

    if (profileError) {
      const { message, status } = handleSupabaseError(profileError)
      return NextResponse.json({ error: message }, { status })
    }

    const isAdmin = profile?.role === 'admin'

    // Get request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const validationResult = putSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { action } = validationResult.data

    // Fetch current mediation
    const { data: mediation, error: fetchError } = await supabase
      .from('mediations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !mediation) {
      return NextResponse.json({ error: 'Mediación no encontrada' }, { status: 404 })
    }

    // Check permissions
    if (!isAdmin && mediation.employee_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const updateData: Record<string, unknown> = {
      updated_at: now,
    }

    // Helper function to convert time string (HH:MM) to ISO timestamp in local time for storage
    const timeToTimestamp = (timeString: string | null | undefined): string | null => {
      if (!timeString) return null
      
      const [hours, minutes] = timeString.split(':').map(Number)
      
      // Create date in local time
      const baseDate = new Date(mediation.date + 'T00:00:00')
      baseDate.setHours(hours, minutes, 0, 0)
      
      return baseDate.toISOString()
    }

    // Helper function to extract time from ISO timestamp (HH:MM) in local time
    const extractTimeFromTimestamp = (timestamp: string | null): string | null => {
      if (!timestamp) return null
      const date = new Date(timestamp)
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    // Handle different actions
    switch (action) {
      case 'propose':
        if (mediation.status === 'resolved' || mediation.status === 'closed_no_changes') {
          return NextResponse.json(
            { error: 'No se pueden proponer cambios en una mediación cerrada' },
            { status: 400 }
          )
        }

        updateData.proposed_clock_in = timeToTimestamp(body.clock_in)
        updateData.proposed_clock_out = timeToTimestamp(body.clock_out)
        updateData.proposed_total_hours = body.total_hours || null
        updateData.proposed_by = user.id
        updateData.proposed_at = now
        updateData.status = 'in_discussion'
        
        if (isAdmin) {
          updateData.admin_last_activity_at = now
        } else {
          updateData.employee_last_activity_at = now
        }
        updateData.last_activity_by = user.id
        break

      case 'counter':
        if (mediation.status === 'resolved' || mediation.status === 'closed_no_changes') {
          return NextResponse.json(
            { error: 'No se pueden proponer cambios en una mediación cerrada' },
            { status: 400 }
          )
        }

        updateData.counter_clock_in = timeToTimestamp(body.clock_in)
        updateData.counter_clock_out = timeToTimestamp(body.clock_out)
        updateData.counter_total_hours = body.total_hours || null
        updateData.counter_by = user.id
        updateData.counter_at = now
        updateData.status = 'in_discussion'
        
        if (isAdmin) {
          updateData.admin_last_activity_at = now
        } else {
          updateData.employee_last_activity_at = now
        }
        updateData.last_activity_by = user.id
        break

      case 'accept':
        if (!mediation.proposed_by) {
          return NextResponse.json(
            { error: 'No hay propuesta para aceptar' },
            { status: 400 }
          )
        }

        const isProposingParty = mediation.proposed_by === user.id
        if (isProposingParty) {
          return NextResponse.json(
            { error: 'No puedes aceptar tu propia propuesta' },
            { status: 400 }
          )
        }

        const clockIn = mediation.proposed_clock_in
        const clockOut = mediation.proposed_clock_out
        const totalHours = mediation.proposed_total_hours

        if (mediation.admin_time_log_id) {
          const { error: adminUpdateError } = await supabase
            .from('time_logs')
            .update({
              clock_in: clockIn,
              clock_out: clockOut,
              total_hours: totalHours,
              edited_by: user.id,
              edited_at: now,
              edit_reason: 'Mediación resuelta - acuerdo mutuo',
            })
            .eq('id', mediation.admin_time_log_id)

          if (adminUpdateError) {
            const { message, status } = handleSupabaseError(adminUpdateError)
            return NextResponse.json({ error: message }, { status })
          }
        }

        if (mediation.employee_time_log_id) {
          const { error: employeeUpdateError } = await supabase
            .from('time_logs')
            .update({
              clock_in: clockIn,
              clock_out: clockOut,
              total_hours: totalHours,
              edited_by: user.id,
              edited_at: now,
              edit_reason: 'Mediación resuelta - acuerdo mutuo',
            })
            .eq('id', mediation.employee_time_log_id)

          if (employeeUpdateError) {
            const { message, status } = handleSupabaseError(employeeUpdateError)
            return NextResponse.json({ error: message }, { status })
          }
        }

        updateData.status = 'resolved'
        updateData.resolved_at = now
        updateData.resolved_by = user.id
        updateData.resolution_notes = `Acuerdo alcanzado el ${new Date().toLocaleDateString('es-CL')}`

        if (isAdmin) {
          updateData.admin_last_activity_at = now
        } else {
          updateData.employee_last_activity_at = now
        }
        updateData.last_activity_by = user.id
        break

      case 'reject':
        if (!mediation.proposed_by) {
          return NextResponse.json(
            { error: 'No hay propuesta para rechazar' },
            { status: 400 }
          )
        }

        const isProposingPartyReject = mediation.proposed_by === user.id
        if (isProposingPartyReject) {
          return NextResponse.json(
            { error: 'No puedes rechazar tu propia propuesta' },
            { status: 400 }
          )
        }

        const rejectNote = {
          id: crypto.randomUUID(),
          author_id: user.id,
          author_name: profile?.full_name || (isAdmin ? 'Administrador' : 'Empleado'),
          author_role: isAdmin ? 'admin' : 'employee',
          content: 'rechazó la propuesta. Continúen discutiendo en el chat para encontrar una solución.',
          type: 'system' as const,
          created_at: now,
        }

        updateData.notes = [...(mediation.notes || []), rejectNote]
        updateData.status = 'in_discussion'

        if (isAdmin) {
          updateData.admin_last_activity_at = now
        } else {
          updateData.employee_last_activity_at = now
        }
        updateData.last_activity_by = user.id
        break

      case 'close':
        updateData.status = 'closed_no_changes'
        updateData.resolved_at = now
        updateData.resolved_by = user.id
        updateData.resolution_notes = body.close_reason || 'Cerrado sin cambios'
        updateData.is_active = false
        break

      case 'close_view':
        // Individual closure - only affects the user's own view
        if (isAdmin) {
          updateData.admin_closed_at = now
        } else {
          updateData.employee_closed_at = now
        }
        updateData.last_activity_by = user.id
        break

      case 'reopen_view':
        // Reopen individual view - only affects the user's own view
        if (isAdmin) {
          updateData.admin_closed_at = null
        } else {
          updateData.employee_closed_at = null
        }
        updateData.last_activity_by = user.id
        break

      case 'comment':
        if (!body.comment) {
          return NextResponse.json(
            { error: 'El comentario es requerido' },
            { status: 400 }
          )
        }

        const newNote = {
          id: crypto.randomUUID(),
          author_id: user.id,
          author_name: profile?.full_name || (isAdmin ? 'Administrador' : 'Empleado'),
          author_role: isAdmin ? 'admin' : 'employee',
          content: body.comment,
          type: 'comment',
          created_at: now,
        }

        updateData.notes = [...(mediation.notes || []), newNote]
        
        if (isAdmin) {
          updateData.admin_last_activity_at = now
        } else {
          updateData.employee_last_activity_at = now
        }
        updateData.last_activity_by = user.id
        break

      case 'update_record':
        if (!body.time_log_id) {
          return NextResponse.json(
            { error: 'ID de registro requerido' },
            { status: 400 }
          )
        }

        const proposedClockIn = timeToTimestamp(body.clock_in)
        const proposedClockOut = timeToTimestamp(body.clock_out)
        
        // Calculate total hours if not provided
        let proposedTotalHours = body.total_hours || null
        if (!proposedTotalHours && proposedClockIn && proposedClockOut) {
          const inDate = new Date(proposedClockIn)
          const outDate = new Date(proposedClockOut)
          const diffMs = outDate.getTime() - inDate.getTime()
          if (diffMs > 0) {
            proposedTotalHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10
          }
        }

        // Use display strings if provided (from client in local time), otherwise extract from timestamp
        const displayClockIn = body.clock_in_display || extractTimeFromTimestamp(proposedClockIn) || '--:--'
        const displayClockOut = body.clock_out_display || extractTimeFromTimestamp(proposedClockOut) || '--:--'

        const { error: updateLogError } = await supabase
          .from('time_logs')
          .update({
            clock_in: proposedClockIn,
            clock_out: proposedClockOut,
            total_hours: proposedTotalHours,
            edited_by: user.id,
            edited_at: now,
            edit_reason: body.reason || 'Ajuste en mediación',
          })
          .eq('id', body.time_log_id)

        if (updateLogError) {
          const { message, status } = handleSupabaseError(updateLogError)
          return NextResponse.json({ error: message }, { status })
        }

        const systemNote = {
          id: crypto.randomUUID(),
          author_id: user.id,
          author_name: profile?.full_name || (isAdmin ? 'Administrador' : 'Empleado'),
          author_role: isAdmin ? 'admin' : 'employee',
          content: `Propuso nuevos horarios: ${displayClockIn} - ${displayClockOut} (${proposedTotalHours || 0}h)`,
          type: 'system',
          created_at: now,
        }

        const currentNotes: Array<{
          id: string
          author_id: string
          author_name: string
          author_role: string
          content: string
          type: string
          created_at: string
        }> = mediation.notes || []

        updateData.proposed_clock_in = proposedClockIn
        updateData.proposed_clock_out = proposedClockOut
        updateData.proposed_total_hours = proposedTotalHours
        updateData.proposed_by = user.id
        updateData.proposed_at = now

        let finalNotes = [...currentNotes, systemNote]

        const isAdminRecord = body.time_log_id === mediation.admin_time_log_id
        const otherLogId = isAdminRecord
          ? mediation.employee_time_log_id
          : mediation.admin_time_log_id

        if (otherLogId) {
          const { data: otherLog } = await supabase
            .from('time_logs')
            .select('clock_in, clock_out, total_hours')
            .eq('id', otherLogId)
            .single()

          if (otherLog) {
            const normalizeToMinutes = (isoString: string | null): number | null => {
              if (!isoString) return null
              const date = new Date(isoString)
              return date.getUTCHours() * 60 + date.getUTCMinutes()
            }

            const proposedIn = proposedClockIn ? normalizeToMinutes(proposedClockIn) : null
            const proposedOut = proposedClockOut ? normalizeToMinutes(proposedClockOut) : null
            const otherIn = otherLog.clock_in ? normalizeToMinutes(otherLog.clock_in) : null
            const otherOut = otherLog.clock_out ? normalizeToMinutes(otherLog.clock_out) : null

            const clockInMatch = proposedIn !== null && otherIn !== null && Math.abs(proposedIn - otherIn) <= 1
            const clockOutMatch = (proposedOut === null && otherOut === null) || 
              (proposedOut !== null && otherOut !== null && Math.abs(proposedOut - otherOut) <= 1)

            if (clockInMatch && clockOutMatch) {
              updateData.suggested_clock_in = proposedClockIn
              updateData.suggested_clock_out = proposedClockOut
              updateData.suggested_total_hours = proposedTotalHours
              updateData.suggested_by = user.id
              updateData.suggested_at = now
            }
          }
        }

        updateData.notes = finalNotes
        updateData.status = 'in_discussion'

        if (isAdmin) {
          updateData.admin_last_activity_at = now
        } else {
          updateData.employee_last_activity_at = now
        }
        updateData.last_activity_by = user.id
        break

      default:
        return NextResponse.json(
          { error: 'Acción no válida' },
          { status: 400 }
        )
    }

    // Update mediation
    const { data: updatedMediation, error: updateError } = await supabase
      .from('mediations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      const { message, status } = handleSupabaseError(updateError)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({
      success: true,
      mediation: updatedMediation,
      message: 'Mediación actualizada exitosamente',
    })
  } catch (error) {
    console.error('Unexpected error in PUT /api/mediations/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE /api/mediations/[id] - Soft delete mediation
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

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      const { message, status } = handleSupabaseError(profileError)
      return NextResponse.json({ error: message }, { status })
    }

    const isAdmin = profile?.role === 'admin'

    // Fetch mediation
    const { data: mediation, error: fetchError } = await supabase
      .from('mediations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !mediation) {
      return NextResponse.json({ error: 'Mediación no encontrada' }, { status: 404 })
    }

    // Check permissions
    if (!isAdmin && mediation.employee_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Check if mediation can be deleted
    if (!isAdmin && mediation.status !== 'pending_review' && mediation.status !== 'in_discussion') {
      return NextResponse.json(
        { error: 'No se puede eliminar una mediación que ya está resuelta' },
        { status: 400 }
      )
    }

    const now = new Date().toISOString()

    // Soft delete
    const { error: updateError } = await supabase
      .from('mediations')
      .update({
        is_active: false,
        deleted_at: now,
        deleted_by: user.id,
        status: 'closed_no_changes',
      })
      .eq('id', id)

    if (updateError) {
      const { message, status } = handleSupabaseError(updateError)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({
      success: true,
      message: 'Mediación eliminada exitosamente',
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/mediations/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
