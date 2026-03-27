import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSupabaseError } from '@/lib/supabase/errors'
import { localDateTimeToUTC } from '@/lib/utils'
import { z } from 'zod'

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(10),
  offset: z.coerce.number().min(0).default(0),
  source: z.enum(['personal', 'official', 'all']).default('personal'),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = {
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
      source: searchParams.get('source') || undefined,
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
    }

    const validationResult = querySchema.safeParse(queryParams)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Parámetros inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { limit, offset, source, date_from, date_to } = validationResult.data

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Build query with filters
    let query = supabase
      .from('time_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)

    // Filter by source (personal/official/all)
    if (source === 'personal') {
      query = query.eq('is_official', false)
    } else if (source === 'official') {
      query = query.eq('is_official', true)
    }
    // if source === 'all', no filter applied

    // Filter by date range
    if (date_from) {
      query = query.gte('date', date_from)
    }
    if (date_to) {
      query = query.lte('date', date_to)
    }

    const { data, count, error } = await query
      .order('date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching time logs:', error)
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/time-logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

const postSchema = z.object({
  clock_in: z.string().min(1, 'Hora de entrada inválida'),
  clock_out: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
  is_manual: z.boolean().default(true),
  is_official: z.boolean().default(false),
  notes: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
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

    const { clock_in, clock_out, date, is_manual, is_official, notes } = validationResult.data

    // Convert local time to UTC for PostgreSQL TIMESTAMPTZ
    // Handle both HH:MM format and full ISO format
    const convertToUTC = (timeStr: string): string => {
      if (!timeStr) return timeStr
      
      // If it's a full ISO string (contains 'T'), parse normally
      if (timeStr.includes('T')) {
        return new Date(timeStr).toISOString()
      }
      
      // If it's just HH:MM, combine with the date
      const [hours, minutes] = timeStr.split(':')
      const localDateTime = new Date(`${date}T${hours}:${minutes}:00`)
      return localDateTime.toISOString()
    }

    const clockInUTC = convertToUTC(clock_in)
    const clockOutUTC = clock_out ? convertToUTC(clock_out) : null

    // Check for existing record of the same type (personal) for this date
    // Note: Employees can only create personal records (is_official = false)
    const { data: existing, error: existingError } = await supabase
      .from('time_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', date)
      .eq('is_official', false)
      .maybeSingle()

    if (existingError) {
      console.error('Existing check error:', existingError)
      const { message, status } = handleSupabaseError(existingError)
      return NextResponse.json({ error: message }, { status })
    }

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un registro personal para esta fecha' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('time_logs')
      .insert({
        user_id: user.id,
        date,
        clock_in: clockInUTC,
        clock_out: clockOutUTC,
        is_manual,
        is_official,
        marked_by: user.id,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      console.error('Insert data:', { user_id: user.id, date, clock_in: clockInUTC, clock_out: clockOutUTC, is_manual, is_official })
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message, details: error.message }, { status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Unexpected error in POST /api/time-logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

const putSchema = z.object({
  id: z.string().uuid('ID inválido'),
  clock_in: z.string().optional(),
  clock_out: z.string().optional(),
  notes: z.string().max(500).optional(),
})

export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
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

    const { clock_in, clock_out, notes } = validationResult.data

    // Convert local datetime strings to UTC for PostgreSQL TIMESTAMPTZ if provided
    const clockInUTC = clock_in ? new Date(clock_in).toISOString() : undefined
    const clockOutUTC = clock_out ? new Date(clock_out).toISOString() : undefined

    const { data: existingLog, error: existingError } = await supabase
      .from('time_logs')
      .select('user_id, is_official')
      .eq('id', id)
      .single()

    if (existingError) {
      console.error('Existing log fetch error:', existingError)
      const { message, status } = handleSupabaseError(existingError)
      return NextResponse.json({ error: message }, { status })
    }

    if (!existingLog) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    if (existingLog.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (existingLog.is_official) {
      return NextResponse.json(
        { error: 'No puedes editar registros oficiales' },
        { status: 403 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (clockInUTC !== undefined) updateData.clock_in = clockInUTC
    if (clockOutUTC !== undefined) updateData.clock_out = clockOutUTC
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
    console.error('Unexpected error in PUT /api/time-logs:', error)
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const { data: existingLog, error: existingError } = await supabase
      .from('time_logs')
      .select('user_id, is_official')
      .eq('id', id)
      .single()

    if (existingError) {
      console.error('Existing log fetch error:', existingError)
      const { message, status } = handleSupabaseError(existingError)
      return NextResponse.json({ error: message }, { status })
    }

    if (!existingLog) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    if (existingLog.user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    if (existingLog.is_official) {
      return NextResponse.json(
        { error: 'No puedes eliminar registros oficiales' },
        { status: 403 }
      )
    }

    const { error } = await supabase.from('time_logs').delete().eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      const { message, status } = handleSupabaseError(error)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/time-logs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
