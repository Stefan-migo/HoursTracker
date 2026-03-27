import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSupabaseError } from '@/lib/supabase/errors'
import { z } from 'zod'

const querySchema = z.object({
  status: z.enum(['pending_review', 'in_discussion', 'agreement_reached', 'resolved', 'closed_no_changes', 'all']).optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  employee_id: z.string().uuid().optional(),
  show_stale: z.enum(['true', 'false']).optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = {
      status: searchParams.get('status') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      employee_id: searchParams.get('employee_id') || undefined,
      show_stale: searchParams.get('show_stale') || undefined,
    }

    const validationResult = querySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { status, start_date, end_date, employee_id, show_stale } = validationResult.data

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
      console.error('Profile fetch error:', profileError)
      const { message, status } = handleSupabaseError(profileError)
      return NextResponse.json({ error: message }, { status })
    }

    const isAdmin = profile?.role === 'admin'

    // Build query
    let query = supabase
      .from('mediations')
      .select(`
        *,
        employee:employee_id (
          full_name,
          email
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Role-based filtering
    if (isAdmin) {
      // Admin can filter by employee
      if (employee_id) {
        query = query.eq('employee_id', employee_id)
      }
    } else {
      // Employee can only see their own
      query = query.eq('employee_id', user.id)
    }

    // Status filter
    if (status === 'all') {
      // Get all statuses - no filter
    } else if (status) {
      query = query.eq('status', status)
    } else {
      // Default: only active mediations
      query = query.in('status', ['pending_review', 'in_discussion', 'agreement_reached'])
    }

    // Date range filter
    if (start_date) {
      query = query.gte('date', start_date)
    }
    if (end_date) {
      query = query.lte('date', end_date)
    }

    const { data: mediations, error } = await query

    if (error) {
      console.error('Error fetching mediations:', error)
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message }, { status })
    }

    // Calculate stale status for each mediation
    const now = new Date()
    const staleThreshold = 48 * 60 * 60 * 1000 // 48 hours in ms

    const mediationsWithStale = (mediations || []).map(mediation => {
      const lastActivity = new Date(
        Math.max(
          new Date(mediation.created_at).getTime(),
          new Date(mediation.admin_last_activity_at || 0).getTime(),
          new Date(mediation.employee_last_activity_at || 0).getTime()
        )
      )
      const isStale = now.getTime() - lastActivity.getTime() > staleThreshold

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

      return {
        ...mediation,
        is_stale: isStale,
        last_activity_at: lastActivity.toISOString(),
        differences: {
          clock_in_diff_minutes: clockInDiffMinutes,
          clock_out_diff_minutes: clockOutDiffMinutes,
          hours_diff: hoursDiff,
        }
      }
    })

    // Calculate summary - always count all statuses from the full dataset
    const summary = {
      total: mediationsWithStale.length,
      pending_review: mediationsWithStale.filter(m => m.status === 'pending_review').length,
      in_discussion: mediationsWithStale.filter(m => m.status === 'in_discussion').length,
      agreement_reached: mediationsWithStale.filter(m => m.status === 'agreement_reached').length,
      resolved: mediationsWithStale.filter(m => m.status === 'resolved').length,
      closed_no_changes: mediationsWithStale.filter(m => m.status === 'closed_no_changes').length,
      stale_count: mediationsWithStale.filter(m => m.is_stale).length,
    }

    // Apply status filter to return only requested (or default to active)
    let filteredMediations = mediationsWithStale
    if (status === 'all') {
      // Return all mediations
      filteredMediations = mediationsWithStale
    } else if (status) {
      filteredMediations = mediationsWithStale.filter(m => m.status === status)
    } else {
      // Default: only active mediations
      filteredMediations = mediationsWithStale.filter(m => 
        ['pending_review', 'in_discussion', 'agreement_reached'].includes(m.status)
      )
    }

    return NextResponse.json({
      mediations: filteredMediations,
      summary
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/mediations:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

const postSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  initial_reason: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(1000),
  admin_time_log_id: z.string().uuid().optional(),
  employee_time_log_id: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      const { message, status } = handleSupabaseError(profileError)
      return NextResponse.json({ error: message }, { status })
    }

    if (!profile?.is_active) {
      return NextResponse.json(
        { error: 'Tu cuenta está inactiva' },
        { status: 403 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const validationResult = postSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { date, initial_reason, admin_time_log_id, employee_time_log_id } = validationResult.data

    const isAdmin = profile?.role === 'admin'
    const employeeId = isAdmin ? (body.employee_id || user.id) : user.id

    // Check if there's already an active mediation for this date
    const { data: existing, error: existingError } = await supabase
      .from('mediations')
      .select('id')
      .eq('employee_id', employeeId)
      .eq('date', date)
      .eq('is_active', true)
      .in('status', ['pending_review', 'in_discussion', 'agreement_reached'])
      .maybeSingle()

    if (existingError) {
      console.error('Existing check error:', existingError)
      const { message, status } = handleSupabaseError(existingError)
      return NextResponse.json({ error: message }, { status })
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una mediación activa para esta fecha' },
        { status: 409 }
      )
    }

    // Fetch the actual time log values to store as snapshots
    let adminClockIn = null
    let adminClockOut = null
    let adminTotalHours = null
    let employeeClockIn = null
    let employeeClockOut = null
    let employeeTotalHours = null

    if (admin_time_log_id) {
      const { data: adminLog } = await supabase
        .from('time_logs')
        .select('clock_in, clock_out, total_hours')
        .eq('id', admin_time_log_id)
        .single()
      
      if (adminLog) {
        adminClockIn = adminLog.clock_in
        adminClockOut = adminLog.clock_out
        adminTotalHours = adminLog.total_hours
      }
    }

    if (employee_time_log_id) {
      const { data: employeeLog } = await supabase
        .from('time_logs')
        .select('clock_in, clock_out, total_hours')
        .eq('id', employee_time_log_id)
        .single()
      
      if (employeeLog) {
        employeeClockIn = employeeLog.clock_in
        employeeClockOut = employeeLog.clock_out
        employeeTotalHours = employeeLog.total_hours
      }
    }

    // Create mediation
    const { data: mediation, error } = await supabase
      .from('mediations')
      .insert({
        employee_id: employeeId,
        date,
        admin_time_log_id: admin_time_log_id || null,
        employee_time_log_id: employee_time_log_id || null,
        admin_clock_in_snap: adminClockIn,
        admin_clock_out_snap: adminClockOut,
        admin_total_hours_snap: adminTotalHours,
        employee_clock_in_snap: employeeClockIn,
        employee_clock_out_snap: employeeClockOut,
        employee_total_hours_snap: employeeTotalHours,
        initial_reason,
        status: 'pending_review',
        created_at: new Date().toISOString(),
        employee_last_activity_at: isAdmin ? null : new Date().toISOString(),
        admin_last_activity_at: isAdmin ? new Date().toISOString() : null,
        last_activity_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message }, { status })
    }

    // Update time_logs to reference this mediation
    if (admin_time_log_id) {
      await supabase
        .from('time_logs')
        .update({ mediation_id: mediation.id })
        .eq('id', admin_time_log_id)
    }

    if (employee_time_log_id) {
      await supabase
        .from('time_logs')
        .update({ mediation_id: mediation.id })
        .eq('id', employee_time_log_id)
    }

    return NextResponse.json({
      id: mediation.id,
      status: mediation.status,
      message: 'Mediación creada exitosamente',
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/mediations:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
