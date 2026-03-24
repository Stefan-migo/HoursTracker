import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSupabaseError } from '@/lib/supabase/errors'
import { z } from 'zod'

const querySchema = z.object({
  status: z.enum(['pending', 'resolved', 'rejected']).optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = {
      status: searchParams.get('status') || undefined,
    }

    const validationResult = querySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { status } = validationResult.data

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

    let query = supabase
      .from('disputes')
      .select(
        `
        *,
        employee:employee_id (
          full_name,
          email
        )
      `
      )
      .order('created_at', { ascending: false })

    if (profile?.role === 'admin') {
      if (status) {
        query = query.eq('status', status)
      }
    } else {
      query = query.eq('employee_id', user.id)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching disputes:', error)
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Unexpected error in GET /api/disputes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

const postSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  admin_clock_in: z.string().datetime().optional(),
  admin_clock_out: z.string().datetime().optional(),
  admin_total_hours: z.number().optional(),
  employee_clock_in: z.string().datetime().optional(),
  employee_clock_out: z.string().datetime().optional(),
  employee_total_hours: z.number().optional(),
  reason: z.string().min(10).max(1000),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

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

    const {
      date,
      admin_clock_in,
      admin_clock_out,
      admin_total_hours,
      employee_clock_in,
      employee_clock_out,
      employee_total_hours,
      reason,
    } = validationResult.data

    // Verify dispute exists - check if records actually differ
    if (admin_clock_in === employee_clock_in && admin_clock_out === employee_clock_out) {
      return NextResponse.json(
        { error: 'Los registros son idénticos, no hay diferencia para disputar' },
        { status: 400 }
      )
    }

    const { data: existing, error: existingError } = await supabase
      .from('disputes')
      .select('id')
      .eq('employee_id', user.id)
      .eq('date', date)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingError) {
      console.error('Existing check error:', existingError)
      const { message, status } = handleSupabaseError(existingError)
      return NextResponse.json({ error: message }, { status })
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una disputa pendiente para esta fecha' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('disputes')
      .insert({
        employee_id: user.id,
        date,
        admin_clock_in: admin_clock_in || null,
        admin_clock_out: admin_clock_out || null,
        admin_total_hours: admin_total_hours || null,
        employee_clock_in: employee_clock_in || null,
        employee_clock_out: employee_clock_out || null,
        employee_total_hours: employee_total_hours || null,
        reason,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error in POST /api/disputes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

const putSchema = z.object({
  id: z.string().uuid('ID inválido'),
  status: z.enum(['resolved', 'rejected']),
  resolution_notes: z.string().max(1000).optional(),
})

export async function PUT(request: Request) {
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
      return NextResponse.json(
        { error: 'Solo admins pueden resolver disputas' },
        { status: 403 }
      )
    }

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

    const { id, status, resolution_notes } = validationResult.data

    const { data, error } = await supabase
      .from('disputes')
      .update({
        status,
        resolution_notes: resolution_notes || null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error in PUT /api/disputes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
