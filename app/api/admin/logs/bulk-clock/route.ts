import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleSupabaseError } from '@/lib/supabase/errors'
import { z } from 'zod'

const bulkClockSchema = z.object({
  action: z.enum(['clock_in', 'clock_out', 'clock_full']),
  user_ids: z.array(z.string().uuid()).min(1, 'Al menos un usuario requerido'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  clock_in: z.string().optional(),
  clock_out: z.string().optional(),
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

    const validationResult = bulkClockSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { action, user_ids, date, clock_in, clock_out, notes } = validationResult.data

    const results: { user_id: string; success: boolean; error?: string }[] = []

    for (const targetUserId of user_ids) {
      try {
        if (action === 'clock_in') {
          const { data: existing, error: existingError } = await supabase
            .from('time_logs')
            .select('id')
            .eq('user_id', targetUserId)
            .eq('date', date)
            .eq('is_official', true)
            .not('clock_in', 'is', null)
            .maybeSingle()

          if (existingError) {
            results.push({ user_id: targetUserId, success: false, error: 'Error checking existing' })
            continue
          }

          if (existing) {
            results.push({ user_id: targetUserId, success: false, error: 'Ya existe entrada' })
            continue
          }

          let entryTime: string
          if (clock_in) {
            const localDate = new Date(clock_in)
            if (isNaN(localDate.getTime())) {
              results.push({ user_id: targetUserId, success: false, error: 'Hora inválida' })
              continue
            }
            entryTime = localDate.toISOString()
          } else {
            entryTime = new Date().toISOString()
          }

          const { error: insertError } = await supabase
            .from('time_logs')
            .insert({
              user_id: targetUserId,
              date,
              clock_in: entryTime,
              is_official: true,
              is_manual: true,
              marked_by: user.id,
              notes: notes || null,
            })

          if (insertError) {
            results.push({ user_id: targetUserId, success: false, error: insertError.message })
          } else {
            results.push({ user_id: targetUserId, success: true })
          }

        } else if (action === 'clock_out') {
          const { data: existing, error: existingError } = await supabase
            .from('time_logs')
            .select('id, clock_in')
            .eq('user_id', targetUserId)
            .eq('date', date)
            .eq('is_official', true)
            .is('clock_out', null)
            .maybeSingle()

          if (existingError) {
            results.push({ user_id: targetUserId, success: false, error: 'Error checking existing' })
            continue
          }

          if (!existing) {
            results.push({ user_id: targetUserId, success: false, error: 'Sin entrada' })
            continue
          }

          let exitTime: string
          if (clock_out) {
            const localDate = new Date(clock_out)
            if (isNaN(localDate.getTime())) {
              results.push({ user_id: targetUserId, success: false, error: 'Hora inválida' })
              continue
            }
            exitTime = localDate.toISOString()
          } else {
            exitTime = new Date().toISOString()
          }

          const { error: updateError } = await supabase
            .from('time_logs')
            .update({
              clock_out: exitTime,
              is_official: true,
              is_manual: true,
              marked_by: user.id,
              notes: notes || null,
            })
            .eq('id', existing.id)

          if (updateError) {
            results.push({ user_id: targetUserId, success: false, error: updateError.message })
          } else {
            results.push({ user_id: targetUserId, success: true })
          }

        } else if (action === 'clock_full') {
          if (!clock_in || !clock_out) {
            results.push({ user_id: targetUserId, success: false, error: 'Faltan horas' })
            continue
          }

          const localClockIn = new Date(clock_in)
          const localClockOut = new Date(clock_out)

          if (isNaN(localClockIn.getTime()) || isNaN(localClockOut.getTime())) {
            results.push({ user_id: targetUserId, success: false, error: 'Horas inválidas' })
            continue
          }

          if (localClockOut <= localClockIn) {
            results.push({ user_id: targetUserId, success: false, error: 'Salida antes de entrada' })
            continue
          }

          const { error: insertError } = await supabase
            .from('time_logs')
            .insert({
              user_id: targetUserId,
              date,
              clock_in: localClockIn.toISOString(),
              clock_out: localClockOut.toISOString(),
              total_hours: Math.round(((localClockOut.getTime() - localClockIn.getTime()) / (1000 * 60 * 60)) * 100) / 100,
              is_official: true,
              is_manual: true,
              marked_by: user.id,
              notes: notes || null,
            })

          if (insertError) {
            results.push({ user_id: targetUserId, success: false, error: insertError.message })
          } else {
            results.push({ user_id: targetUserId, success: true })
          }
        }
      } catch {
        results.push({ user_id: targetUserId, success: false, error: 'Error interno' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      total: user_ids.length,
      success: successCount,
      failed: failCount,
      results,
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/logs/bulk-clock:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
