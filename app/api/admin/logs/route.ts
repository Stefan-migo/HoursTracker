import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSupabaseError } from '@/lib/supabase/errors'
import { z } from 'zod'

const querySchema = z.object({
  user_id: z.string().uuid().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
  offset: z.coerce.number().min(0).default(0),
})

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const queryParams = {
      user_id: searchParams.get('user_id') || undefined,
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    }

    const validationResult = querySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { user_id, start_date, end_date, limit, offset } = validationResult.data

    // Optimized query with JOIN to avoid N+1
    // Admins only see official records (is_official = true)
    let query = supabase
      .from('time_logs')
      .select(
        `
        id,
        date,
        clock_in,
        clock_out,
        total_hours,
        is_official,
        is_manual,
        notes,
        user_id,
        created_at,
        profiles:user_id (
          full_name,
          email
        )
      `,
        { count: 'exact' }
      )
      .eq('is_official', true) // Always filter for official records only
      .order('date', { ascending: false })

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    if (start_date) {
      query = query.gte('date', start_date)
    }

    if (end_date) {
      query = query.lte('date', end_date)
    }

    const { data: logs, count, error } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching logs:', error)
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ data: logs || [], count: count || 0 })
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

const postSchema = z.object({
  user_id: z.string().uuid('ID de empleado inválido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  clock_in: z.string().min(1, 'Hora de entrada inválida'),
  clock_out: z.string().optional().nullable(),
  is_official: z.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
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

    const validationResult = postSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { user_id, date, clock_in, clock_out, is_official, notes } = validationResult.data

    // Convert local datetime strings to UTC for PostgreSQL TIMESTAMPTZ
    // clock_in and clock_out are in format "YYYY-MM-DDTHH:MM:SS" (local time)
    const clockInUTC = new Date(clock_in).toISOString()
    const clockOutUTC = clock_out ? new Date(clock_out).toISOString() : null

    // Check for existing official record for this date
    // Admins create official records, so we check for is_official = true
    const { data: existing, error: existingError } = await supabase
      .from('time_logs')
      .select('id')
      .eq('user_id', user_id)
      .eq('date', date)
      .eq('is_official', true)
      .maybeSingle()

    if (existingError) {
      console.error('Existing check error:', existingError)
      const { message, status } = handleSupabaseError(existingError)
      return NextResponse.json({ error: message }, { status })
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un registro oficial para esta fecha' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('time_logs')
      .insert({
        user_id,
        date,
        clock_in: clockInUTC,
        clock_out: clockOutUTC,
        is_manual: true,
        is_official,
        marked_by: user.id,
        notes: notes || null,
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
    console.error('Unexpected error in POST /api/admin/logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

const putSchema = z.object({
  id: z.string().uuid('ID inválido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  clock_in: z.string().optional(),
  clock_out: z.string().optional(),
  is_official: z.boolean().optional(),
  notes: z.string().max(500).optional(),
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
    }

    const validationResult = putSchema.safeParse({ ...body, id })
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { date, clock_in, clock_out, is_official, notes } = validationResult.data

    // Convert local datetime strings to UTC for PostgreSQL TIMESTAMPTZ if provided
    const clockInUTC = clock_in ? new Date(clock_in).toISOString() : undefined
    const clockOutUTC = clock_out ? new Date(clock_out).toISOString() : undefined

    const { error: existingError } = await supabase
      .from('time_logs')
      .select('id')
      .eq('id', id)
      .single()

    if (existingError) {
      console.error('Existing log fetch error:', existingError)
      const { message, status } = handleSupabaseError(existingError)
      return NextResponse.json({ error: message }, { status })
    }

    const updateData: Record<string, unknown> = {}
    if (date !== undefined) updateData.date = date
    if (clockInUTC !== undefined) updateData.clock_in = clockInUTC
    if (clockOutUTC !== undefined) updateData.clock_out = clockOutUTC
    if (is_official !== undefined) updateData.is_official = is_official
    if (notes !== undefined) updateData.notes = notes

    const { data, error } = await supabase
      .from('time_logs')
      .update(updateData)
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
    console.error('Unexpected error in PUT /api/admin/logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const { error } = await supabase.from('time_logs').delete().eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
