import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSupabaseError } from '@/lib/supabase/errors'
import { localDateTimeToUTC } from '@/lib/utils'
import { z } from 'zod'

const clockRequestSchema = z.object({
  action: z.enum(['clock_in', 'clock_out'], {
    message: 'Acción requerida: clock_in o clock_out',
  }),
  user_id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  clock_in: z.string().optional(),
  clock_out: z.string().optional(),
  is_manual: z.boolean().default(false),
  notes: z.string().max(500).default(''),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Body inválido: se espera JSON' },
        { status: 400 }
      )
    }

      const validationResult = clockRequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { action, user_id, date, clock_in, clock_out, is_manual, notes } = validationResult.data

    let targetUserId = user.id

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active, email')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      const { message, status } = handleSupabaseError(profileError)
      return NextResponse.json({ error: message }, { status })
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Perfil no encontrado' },
        { status: 404 }
      )
    }

    if (!profile.is_active) {
      return NextResponse.json(
        { error: 'Tu cuenta está inactiva' },
        { status: 403 }
      )
    }

    if (profile.role === 'admin' && user_id) {
      const { data: targetProfile, error: targetError } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', user_id)
        .single()

      if (targetError) {
        console.error('Target profile fetch error:', targetError)
        const { message, status } = handleSupabaseError(targetError)
        return NextResponse.json({ error: message }, { status })
      }

      if (!targetProfile?.is_active) {
        return NextResponse.json(
          { error: 'El empleado está inactivo' },
          { status: 400 }
        )
      }
      targetUserId = user_id
    } else if (user_id && user_id !== user.id) {
      return NextResponse.json(
        { error: 'No autorizado para registrar en nombre de otro usuario' },
        { status: 403 }
      )
    }

    const today = new Date().toISOString().split('T')[0]
    const targetDate = date || today
    const isOfficial = profile.role === 'admin' && user_id && user_id !== user.id

    if (action === 'clock_in') {
      const { data: existing, error: existingError } = await supabase
        .from('time_logs')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('date', targetDate)
        .eq('is_official', isOfficial)
        .not('clock_in', 'is', null)
        .maybeSingle()

      if (existingError) {
        console.error('Existing check error:', existingError)
        const { message, status } = handleSupabaseError(existingError)
        return NextResponse.json({ error: message }, { status })
      }

      if (existing) {
        return NextResponse.json(
          { error: 'Ya existe una entrada para esta fecha' },
          { status: 409 }
        )
      }

      let entryTime: string
      if (is_manual && clock_in) {
        // Manual entry: clock_in is an ISO datetime string (e.g., "2025-03-22T09:00:00")
        // Parse it as local time and convert to UTC for PostgreSQL TIMESTAMPTZ
        const localDate = new Date(clock_in)
        if (isNaN(localDate.getTime())) {
          return NextResponse.json(
            { error: 'Hora de entrada inválida' },
            { status: 400 }
          )
        }
        entryTime = localDate.toISOString()
      } else {
        entryTime = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('time_logs')
        .insert({
          user_id: targetUserId,
          date: targetDate,
          clock_in: entryTime,
          is_official: isOfficial,
          is_manual: is_manual,
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

    } else if (action === 'clock_out') {
      const { data: existing, error: existingError } = await supabase
        .from('time_logs')
        .select('id, clock_in')
        .eq('user_id', targetUserId)
        .eq('date', targetDate)
        .eq('is_official', isOfficial)
        .is('clock_out', null)
        .maybeSingle()

      if (existingError) {
        console.error('Existing check error:', existingError)
        const { message, status } = handleSupabaseError(existingError)
        return NextResponse.json({ error: message }, { status })
      }

      if (!existing) {
        return NextResponse.json(
          { error: 'No hay entrada sin salida para esta fecha' },
          { status: 404 }
        )
      }

      let exitTime: string
      if (is_manual && clock_out) {
        // Manual entry: clock_out is an ISO datetime string (e.g., "2025-03-22T18:00:00")
        // Parse it as local time and convert to UTC for PostgreSQL TIMESTAMPTZ
        const localDate = new Date(clock_out)
        if (isNaN(localDate.getTime())) {
          return NextResponse.json(
            { error: 'Hora de salida inválida' },
            { status: 400 }
          )
        }
        exitTime = localDate.toISOString()
      } else {
        exitTime = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('time_logs')
        .update({
          clock_out: exitTime,
          is_official: isOfficial,
          is_manual: is_manual,
          marked_by: user.id,
          notes: notes || null,
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Update error:', error)
        const { message, status } = handleSupabaseError(error)
        return NextResponse.json({ error: message }, { status })
      }

      return NextResponse.json(data)
    }

    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Unexpected error in clock endpoint:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
